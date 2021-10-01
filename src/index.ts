
import dotenv from "dotenv";
import {ShardClient} from "detritus-client";
import { parseMessage } from "./messageParser";
dotenv.config();

(() => {
    const shardClient = new ShardClient(process.env.TOKEN as string, {
        cache: {
            sessions: false,
            messages: false,
            channels: false,
            relationships: false,
            roles: false,
            stageInstances: false,
            stickers: false,
            voiceCalls: false,
            voiceConnections: false,
            voiceStates: false
        }
    });

    //const commandClient = new Detritus.InteractionCommandClient(shardClient);

    shardClient.on("messageCreate", (payload) => {
        const parsed = parseMessage(payload.message.content);
        if (parsed) shardClient.rest.createMessage(payload.message.channelId, { content: `You said: ${parsed.map(p => p.name)}` });
    });

    shardClient.run();
})();


