
import dotenv from "dotenv";
import {ShardClient} from "detritus-client";
import { parseMessage } from "./messageParser";
import { fetchContent, findInData } from "./contentFetch";
dotenv.config();

(async () => {
    const DATA = await fetchContent(process.env.DOCS_URL as string);

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
        const links: Array<string> = [];
        if (parsed && parsed.length) {
            for (const query of parsed) {
                const item = findInData(query, DATA);
                if (item) {
                    if (typeof item === "string") links.push(item);
                    else links.push(item[0]);
                }
            }
        }
        if (!links.length) return;
        shardClient.rest.createMessage(payload.message.channelId, { content: links.join("\n" )});
    });

    shardClient.run();
})();


