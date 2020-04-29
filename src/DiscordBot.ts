import Discord, { TextChannel, Guild } from 'discord.js';
import { handleCommand } from './commands';
import ServiceBusHandler from './ServiceBusHandler'
import { serverEmbedToDiscordEmbed } from './helpers'

export default class DiscordBot {
    client: Discord.Client = new Discord.Client()
    serviceBusHandler: ServiceBusHandler = new ServiceBusHandler(this.client)

    bulkSetGuilds = () => {
      const guildIds = this.client.guilds.cache.reduce((ids: Array<string>, guild: Guild) => {
        ids.push(guild.id)
        return ids
      }, [])
      console.log("Bulk setting ids: ", guildIds)
      this.serviceBusHandler.sendMessage({
        group: 'discord',
        action: 'register',
        target: 'bulkSetGuilds',
        data: {
          guildIds
        }
      })
    }
  
    begin = () => {
      this.client.on('ready', () => {
        console.log(`Logged in as ${this.client.user.tag}!`);
        this.serviceBusHandler.begin()
        this.bulkSetGuilds()
        setTimeout(this.bulkSetGuilds, 60*60*1000)
      });
      
      this.client.on('message', (msg: Discord.Message) => {
        if (msg.author.bot) {
          return
        }

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
              this.serviceBusHandler.apiSender.sendBatch(serviceBusMessages.map(el => { return { body: el } }))
            }
          });
        }
      });

      this.client.on("guildCreate", function(guild: Discord.Guild){
        console.log('joined guild: ' + guild.id)
        this.serviceBusHandler.sendMessage({
          group: 'discord',
          action: 'guild',
          target: 'register',
          guild: guild.id
        })
      });

      this.client.on("guildDelete", function(guild: Discord.Guild){
        console.log('left guild: ' + guild.id)
        this.serviceBusHandler.sendMessage({
          group: 'discord',
          action: 'guild',
          target: 'deregister',
          guild: guild.id
        })
    });
  
      this.client.login(process.env.DISCORD_TOKEN);
    }
    
  }