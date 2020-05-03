import axios, { AxiosResponse } from 'axios'
import { Command, CommandResponse, EmbeddedMessage, EmbeddedField, Response, ChannelResponse } from './Types'
import ServiceBusHandler from '../ServiceBusHandler'
import { serverEmbedToDiscordEmbed } from '../helpers'
import Discord, { TextChannel, Guild, Message } from 'discord.js';

export interface IMention {
    id: string
    name: string
    mentionable: boolean
}

export interface IMentionUser extends IMention {
    nick?: string
    discriminator: string
    avatar: string
}

export interface IMentionRole extends IMention {
    color: number
}

export interface IMentions {
    users?: Array<IMentionUser>
    roles?: Array<IMentionRole>
    channels?: Array<IMention>
}

export interface IChannel {
    id: string
}

export interface IGuild {
    id: string
}

export interface ICommandRequest {
    command: string
    args: string
    sender: ISender
    mentions?: IMentions
    flags?: Array<string>
    channel?: IChannel
    guild?: IGuild
}

export interface ISender {
    user_id: string
    username: string
    nickname?: string
    discriminator: string
    roles?: Array<string>
    channel?: string
    guild?: string
    administrator: boolean
}

export class CommandHandler {

    client: Discord.Client
    serviceBusHandler: ServiceBusHandler
    commands: { [name: string]: Command } = {}

    constructor(discordClient: Discord.Client, serviceBusHandler: ServiceBusHandler) {
        this.client = discordClient
        this.serviceBusHandler = serviceBusHandler
    }

    private fetchCommands = (): Promise<{ [name: string]: Command }> => {
        return axios.get('discord-command', { params: { code: process.env.API_KEY }})
        .then(data => data.data)
        .then(data => this.commands = data)
    }

    begin = async () => {
        await this.fetchCommands()
        setTimeout(this.fetchCommands, 60*60*1000)
        
        this.client.on('message', (msg: Discord.Message) => {
            if (msg.author.bot) {
              return
            }
    
            const command = this.handleCommand(msg);
            if (command) {
              command.then(response => {
                const reply = response.reply
                if (reply) {
                  const replyMsg = reply.embed ? serverEmbedToDiscordEmbed(reply.embed) : reply.message;
                  msg.reply(replyMsg);
                }
          
                const dm = response.dm
                if (dm) {
                  const dmMsg = dm.embed ? serverEmbedToDiscordEmbed(dm.embed) : dm.message
                  msg.author.send(dmMsg)
                }
          
                const channel = response.channelResponse
                if (channel) {
                  const channelMsg = channel.response.embed ? serverEmbedToDiscordEmbed(channel.response.embed) : channel.response.message
                  const discordChannel = this.client.channels.cache.get(channel.channel)
                  const textChannel = discordChannel as TextChannel
                  if (textChannel) {
                    textChannel.send(channelMsg)
                  }
                }
          
                const serviceBusMessages = response.serviceBusMessages
                if (serviceBusMessages) {
                  this.serviceBusHandler.apiSender.sendBatch(serviceBusMessages.map(el => { return { body: el } }))
                }
              });
            }
          });
    }

    getCommand = (name: string): Command | undefined => {
        return this.commands[name]
    }

    runCommand = (request: ICommandRequest): Promise<CommandResponse> => {
        return axios.post('discord-command', { ...request }, { params: { code: process.env.API_KEY } })
            .then(data => {
                return data.data
            })
    }

    isRegisteredCommand = (command: string): Boolean => {
        return this.getCommand(command) != undefined;
    }

    handleCommand = (message: Message): Promise<CommandResponse> | void => {
        if (!message.content.startsWith("!")) { return null };
        const splitMessage = message.content.substring(1).split(" ")
        const ranCommand = splitMessage.shift()
        const command = this.getCommand(ranCommand)
        console.log(ranCommand, command, this.commands)
        if (command) {
            if (command.minArgs > splitMessage.length) {
                const response: CommandResponse = {
                    reply: {
                        message: "Invalid usage, try: " + command.usage
                    }
                }
                return Promise.resolve(response)
            }
            const flags = splitMessage.filter(str => str.startsWith('--') && str.length > 2).map(str => str.substring(2))
            const args = splitMessage.filter(str => !str.startsWith('--')).join(" ")
            const sender: ISender = {
                user_id: message.author.id,
                username: message.author.username,
                discriminator: message.author.discriminator,
                roles: message.member?.roles.cache.map(role => role.id),
                channel: message.channel?.id,
                guild: message.guild?.id,
                administrator: message.member?.hasPermission("ADMINISTRATOR") ?? false
            }
            const mentions: IMentions = {
                users: message.mentions.users?.map(user => {
                    const mention: IMentionUser = {
                        id: user.id,
                        name: user.username,
                        discriminator: user.discriminator,
                        avatar: user.avatar,
                        mentionable: true
                    }
                    return mention
                }),
                roles: message.mentions.roles?.map(role => {
                    const mention: IMentionRole = {
                        id: role.id,
                        name: role.name,
                        color: role.color,
                        mentionable: role.mentionable
                    }
                    return mention
                })
            }
            const commandRequest: ICommandRequest = {
                command: command.command,
                args: args,
                sender: sender,
                mentions,
                flags,
                guild: { id: message.guild?.id },
                channel: { id: message.channel?.id }
            }
            return this.runCommand(commandRequest)
        }
    }

};
