import Discord from 'discord.js'
import { ServiceBusClient, ReceiveMode, ServiceBusMessage, QueueClient, Receiver } from '@azure/service-bus'

export interface IServiceBusAction {
    group: string
    action: string
    target?: string
    data?: { [key: string]: any }
}

export interface IServiceBusDiscordAction extends IServiceBusAction {
    guild?: string
    channel?: string
    sender?: string
}

export interface IDiscordSyncAction {
    role?: {
        id: string
        member_ids: Array<string>
    }
    member?: {
        id: string
        role_ids: Array<string>
        remove_role_ids: Array<string>
    }

}

export default class ServiceBusHandler {

    discord: Discord.Client
    serviceBusClient = ServiceBusClient.createFromConnectionString(process.env.SERVICE_BUS_CONNECTION_STRING)
    apiClient = this.serviceBusClient.createQueueClient(process.env.SERVICE_BUS_API_NAME)
    apiSender = this.apiClient.createSender()
    discordQueueClient: QueueClient
    discordQueueReceiver: Receiver

    constructor(discord: Discord.Client) {
        this.discord = discord
    }

    sendMessage = (message: IServiceBusDiscordAction) => {
        this.apiSender.send({
            body: message
        })
    }

    begin = () => {
        this.discordQueueClient = this.serviceBusClient.createQueueClient(process.env.SERVICE_BUS_DISCORD_NAME);
        this.discordQueueReceiver = this.discordQueueClient.createReceiver(ReceiveMode.peekLock);
        this.discordQueueReceiver.registerMessageHandler(this.messageHandler, this.messageErrorHandler)
    }

    handleSyncMessage = (action: IServiceBusAction): Promise<any> => {
        const syncAction: IDiscordSyncAction = action.data
        const guild = this.discord.guilds.cache.get(action.target ?? process.env.DEFAULT_GUILD_ID)
        const promises: Array<Promise<any>> = []

        const roleSyncAction = syncAction.role
        if (roleSyncAction) {
            const allowedMembers = new Set(roleSyncAction.member_ids)
            guild.roles.cache.get(roleSyncAction.id).members.forEach(member => {
                if (!allowedMembers.has(member.id)) {
                    promises.push(member.roles.remove(roleSyncAction.id))
                }
            })
            roleSyncAction.member_ids.forEach(async (element: string) => {
                promises.push(guild.members.cache.get(element).roles.add(roleSyncAction.id))
            })
        }

        const memberSyncAction = syncAction.member
        if (memberSyncAction) {
            const member = guild.members.cache.get(memberSyncAction.id)
            memberSyncAction.role_ids.forEach(async (element: string) => {
                promises.push(member.roles.add(element))
            })
            memberSyncAction.remove_role_ids.forEach(async (element: string) => {
                promises.push(member.roles.remove(element))
            })
        }
        return Promise.all(promises)
    }

    handleMessage = (action: IServiceBusAction): Promise<any> => {
        switch (action.group) {
            case 'sync':
                return this.handleSyncMessage(action)
        }
    }

    messageHandler = async (message: ServiceBusMessage) => {
        const action: IServiceBusAction = message.body
        console.log(action, action.data)
        try {
            await this.handleMessage(action)
            console.log("handled messaged!", action.group)
            message.complete()
        } catch (err) {
            console.error(err)
            message.abandon()
        }
    };

    messageErrorHandler = (error: any) => {
        console.log(error);
    };

}