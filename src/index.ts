
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
        if (payload.message.author.bot) return;
        const parsed = parseMessage(payload.message.content);
        const links: Array<{name: string, link: string, description?: string}> = [];
        if (parsed && parsed.length) {
            for (const query of parsed) {
                const item = findInData(query, DATA);
                if (item) {
                    if (typeof item === "string") links.push({ link: item, name: `${query.name}${query.member ? `.${query.member}`:""}` });
                    else links.push({link: item[0], description: item[1], name: `${query.name}${query.member ? `.${query.member}`:""}` });
                }
            }
            if (!links.length) {
                payload.message.react("❌");
                return;
            }
            shardClient.rest.createMessage(payload.message.channelId, { 
                embed: {
                    description: links.map(link => `**[${link.name}](${link.link})**${link.description ? ` - ${link.description.replace(/(\r\n|\n|\r)/gm, ", ")}...`:""}`).join("\n"),
                    footer: {
                        text: `Searched by ${payload.message.author.username}`,
                        iconUrl: payload.message.author.avatarUrl
                    }
                }
            });
        }
    });

    shardClient.run();
})();


