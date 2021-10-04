
import dotenv from "dotenv";
import {ShardClient} from "detritus-client";
import { parseMessage } from "./messageParser";
import { ExtraSearchData, fetchContent, findInData } from "./contentFetch";
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
        const links: Array<ExtraSearchData> = [];
        const otherPossibilities = [];
        if (parsed && parsed.length) {
            for (const query of parsed) {
                const item = findInData(query, DATA, {
                    highlight: "__",
                    limit: 3,
                    threshold: query.exact ? -1 : -100
                });
                if (item && item.length) {
                    links.push(item[0]);
                    if (item.length > 1 && item[0].obj.name !== query.name) otherPossibilities.push(...item.slice(1));
                }
            }
            if (!links.length) {
                payload.message.react("❌");
                return;
            }
            shardClient.rest.createMessage(payload.message.channelId, { 
                embed: {
                    description: links.map(link => `**[${link.highlighted || link.obj.name}](${link.fullLink})**${link.obj.comment ? ` - ${link.obj.comment.replace(/(\r\n|\n|\r)/gm, ", ")}...`:""}`).join("\n"),
                    footer: {
                        text: `Searched by ${payload.message.author.username}`,
                        iconUrl: payload.message.author.avatarUrl
                    },
                    fields: otherPossibilities.length ? [
                        {
                            name: "Other possible results",
                            value: otherPossibilities.map(link => `**[${link.highlighted || link.obj.name}](${link.fullLink})**${link.obj.comment ? ` - ${link.obj.comment.replace(/(\r\n|\n|\r)/gm, ", ")}...`:""}`).join("\n"),
                        }
                    ] : undefined,
                    color: 0x42ba96
                }
            });
        }
    });

    shardClient.run();
})();


