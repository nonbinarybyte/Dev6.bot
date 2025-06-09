import mongoose from 'mongoose';

const repoSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  repoUrl: { type: String, required: true },
  channelId: { type: String, required: true },
  pingRole: { type: String, default: 'everyone' }
});

export default mongoose.model('Repo', repoSchema);
