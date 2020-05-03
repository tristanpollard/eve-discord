import { Message } from 'discord.js'
import { ICommandRequest } from '.';
import { IServiceBusAction } from '../ServiceBusHandler';

export interface Command {
    command: string
    minArgs?: number,
    usage: string
}

export interface Response {
    message: string,
    embed?: EmbeddedMessage
}

export interface ChannelResponse {
    channel: string,
    response: Response
}

export interface CommandResponse {
    reply?: Response
    dm?: Response
    channelResponse?: ChannelResponse,
    serviceBusMessages?: Array<IServiceBusAction>
}

export interface EmbeddedField {
    name: string,
    value: string,
    inline?: boolean
}

export interface EmbeddedMessage {
    title: string,
    color?: string,
    url?: string,
    fields?: Array<EmbeddedField>,
    image?: string,
    thumbnail?: string
}