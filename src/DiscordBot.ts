import Discord, { TextChannel } from 'discord.js';
import { handleCommand } from './commands';
import ServiceBusHandler from './ServiceBusHandler'
import { serverEmbedToDiscordEmbed } from './helpers'

export default class DiscordBot {
    client: Discord.Client = new Discord.Client()
    serviceBusHandler: ServiceBusHandler = new ServiceBusHandler(this.client)
  
    begin = () => {
      this.client.on('ready', () => {
        console.log(`Logged in as ${this.client.user.tag}!`);
        this.serviceBusHandler.begin()
      });
      
      this.client.on('message', (msg: Discord.Message) => {
        const command = handleCommand(msg);
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
              this.serviceBusHandler.serviceBusSender.sendBatch(serviceBusMessages.map(el => { return { body: el } }))
            }
          });
        }
      });
  
      this.client.login(process.env.DISCORD_TOKEN);
    }
    
  }