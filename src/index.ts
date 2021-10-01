
import dotenv from "dotenv";
import {ShardClient} from "detritus-client";
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
        console.log(payload.message.content);
    });

    shardClient.run();
})();


