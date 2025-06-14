import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ] 
});

client.commands = new Collection();

// Load commands with better error handling
try {
    const commandsPath = join(__dirname, '..', 'commands');
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        const command = await import(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
} catch (error) {
    console.error('Failed to load commands:', error);
    process.exit(1);
}

// Event: When client is ready
client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Modal Submit Handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isModalSubmit()) return;
  
  if (interaction.customId === 'announcementModal') {
    const title = interaction.fields.getTextInputValue('titleInput');
    const description = interaction.fields.getTextInputValue('descriptionInput');
    const imageUrl = interaction.fields.getTextInputValue('imageInput') || null;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor('#0099ff')
      .setTimestamp();

    if (imageUrl) embed.setImage(imageUrl);

    // Get ping role from database (pseudo-code)
    // const pingRole = await db.getPingRole(interaction.guildId);
    const pingRole = 'everyone'; // Replace with actual lookup

    await interaction.reply({
      content: pingRole === 'everyone' ? '@everyone' : `<@&${pingRole}>`,
      embeds: [embed],
      allowedMentions: { parse: ['everyone', 'roles'] }
    });
  }
});

// Event: Interaction handling
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            content: 'There was an error while executing this command!', 
            ephemeral: true 
        });
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
