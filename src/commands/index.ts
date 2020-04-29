import axios, { AxiosResponse } from 'axios'
import { Command, CommandResponse, EmbeddedMessage, EmbeddedField, Response, ChannelResponse } from './Types'
import who from './who'
import auth from './auth'
import link from './link'
import { Message } from 'discord.js'
import unlink from './unlink'
import trawl from './trawl'
import tokens from './tokens'
import sync from './sync'

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

const commands: { [name: string]: Command } = {}
commands[who.name] = who
commands[auth.name] = auth
commands[link.name] = link
commands[unlink.name] = unlink
commands[trawl.name] = trawl
commands[tokens.name] = tokens
commands[sync.name] = sync


const getCommand = (name: string): Command | undefined => {
    return commands[name]
}

export const runCommand = (request: ICommandRequest): Promise<CommandResponse> => {
    return axios.post('discord-command', { ...request }, { params: { code: process.env.API_KEY }})
        .then(data => {
            return data.data
        })
}

export const isRegisteredCommand = (command: string): Boolean => {
    return getCommand(command) != undefined;
}

export const handleCommand = (message: Message): Promise<CommandResponse> | void => {
    if (!message.content.startsWith("!")) { return null };
    const splitMessage = message.content.substring(1).split(" ")
    const ranCommand = splitMessage.shift()
    const command = getCommand(ranCommand)
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
            roles: message.mentions.roles?.map(role=> {
                const mention: IMentionRole =  {
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    mentionable: role.mentionable
                }
                return mention
            })
        }
        const commandRequest: ICommandRequest = {
            command: command.name,
            args: args,
            sender: sender,
            mentions,
            flags,
            guild: { id: message.guild?.id },
            channel: { id: message.channel?.id }
        }
        if (command.function) {
            return command.function(commandRequest, message)
        } else {
            return runCommand(commandRequest)
        }
    }
};
