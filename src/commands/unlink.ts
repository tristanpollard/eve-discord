import { Command } from './Types';

const unlink: Command = {
    name: "unlink",
    minArgs: 3,
    usage: "!unlink <alliance|character|corporation> <name> < role id>"
}
export default unlink