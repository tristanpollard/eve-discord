import { Command, CommandResponse } from './Types';
import { runCommand, ICommandRequest } from './index'
import { Message } from 'discord.js'

const tokens: Command = {
    name: "tokens",
    minArgs: 0,
    usage: "!tokens <name|null>",
}
export default tokens