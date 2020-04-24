import { EmbeddedMessage } from "./commands/Types"
import { MessageEmbed } from "discord.js"

export const serverEmbedToDiscordEmbed = (serverEmbed: EmbeddedMessage): MessageEmbed => {
    const embed = new MessageEmbed()
  
    const color = serverEmbed.color
    if (color) {
      embed.setColor(color)
    }
  
    const title = serverEmbed.title
    if (title) {
      embed.setTitle(title)
    }
  
    const url = serverEmbed.url
    if (url) {
      embed.setURL(url)
    }
  
    const image = serverEmbed.image
    if (image) {
      embed.setImage(image)
    }
  
    const thumbnail = serverEmbed.thumbnail
    if (thumbnail) {
      embed.setThumbnail(thumbnail)
    }
  
    const fields = serverEmbed.fields
    if (fields) {
      embed.addFields(fields)
    }
  
    return embed
  }