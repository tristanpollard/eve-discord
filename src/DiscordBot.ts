import Discord, { Guild } from 'discord.js';
import { CommandHandler } from './commands';
import ServiceBusHandler from './ServiceBusHandler'

export default class DiscordBot {
    client: Discord.Client = new Discord.Client()
    serviceBusHandler: ServiceBusHandler = new ServiceBusHandler(this.client)
    commandHandler: CommandHandler = new CommandHandler(this.client, this.serviceBusHandler)

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

      this.commandHandler.begin()
      
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