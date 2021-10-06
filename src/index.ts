
import dotenv from "dotenv";
import {ShardClient, InteractionCommandClient, GatewayClientEvents } from "detritus-client";
import { parseMessage } from "./messageParser";
import { ExtraSearchData, fetchContent, findInData, LibData } from "./contentFetch";
import { ApplicationCommandOptionTypes } from "detritus-client/lib/constants";
import { InteractionContext } from "detritus-client/lib/interaction";
dotenv.config();

export function findAndSend(channel: GatewayClientEvents.MessageCreate|InteractionContext, queryStr: string, DATA: LibData, isParsed?: boolean, customLimit?: number) : void {
    const parsed = isParsed ? [{ name: queryStr }] : parseMessage(queryStr);
    const links: Array<ExtraSearchData> = [];
    const otherPossibilities = [];
    if (parsed && parsed.length) {
        for (const query of parsed) {
            const item = findInData(query, DATA, {
                highlight: "__",
                limit: customLimit || 3,
                threshold: query.exact ? -1 : -100
            });
            if (item && item.length && !links.some(link => link.obj === item[0].obj)) {
                links.push(item[0]);
                if (item.length > 1 && item[0].obj.name !== query.name) otherPossibilities.push(...item.slice(1));
            }
        }
        if (!links.length) {
            if (channel instanceof InteractionContext) channel.editOrRespond("Couldn't find anything!");
            else channel.message.react("❌");
            return;
        }
        const messageAuthor = channel instanceof InteractionContext ? channel.user : channel.message.author;
        const embed = {
            description: links.map(link => `**[${link.highlighted || link.obj.name}](${link.fullLink})**${link.obj.comment ? ` - ${link.obj.comment.replace(/(\r\n|\n|\r)/gm, ", ")}...`:""}`).join("\n"),
            footer: {
                text: `Searched by ${messageAuthor.username}`,
                iconUrl: messageAuthor.avatarUrl
            },
            fields: otherPossibilities.length ? [
                {
                    name: "Other possible results",
                    value: otherPossibilities.map(link => `**[${link.highlighted || link.obj.name}](${link.fullLink})**${link.obj.comment ? ` - ${link.obj.comment.replace(/(\r\n|\n|\r)/gm, ", ")}...`:""}`).join("\n"),
                }
            ] : undefined,
            color: 0x42ba96
        };
        if (channel instanceof InteractionContext) channel.editOrRespond({embed});
        else channel.message.client.rest.createMessage(channel.message.channelId, {embed});   
    }
}

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

    const commandClient = new InteractionCommandClient(shardClient);

    shardClient.on("messageCreate", (payload) => {
        if (payload.message.author.bot) return;
        findAndSend(payload, payload.message.content, DATA);
    });

    commandClient.add({
        name: "search",
        disableDm: true,
        description: "Search for something from the detritus docs",
        options: [
            {
                name: "query",
                required: true,
                description: "What to search for",
                type: ApplicationCommandOptionTypes.STRING,
                onAutoComplete: (ctx) => {
                    const choices: Array<{name: string, value: string}> = [];
                    let name = ctx.value;
                    let member;
                    if (name.includes(".")) {
                        const [newName, newMember] = name.split(".");
                        name = newName;
                        member = newMember;
                    }
                    const results = findInData({name, member}, DATA, {
                        limit: 25,
                        searchAll: true,
                        excludeBase: true
                    });
                    if (results) choices.push(...results.map(res =>{
                        const fullname = res.obj.preparedWithParent?.target || res.obj.name;
                        return { name: res.obj.preparedWithParent?.target || res.obj.name, value: `${fullname}~${res.fullLink}` };
                    }));
                    return ctx.respond({choices});
                }
            }
        ],
        run: (ctx) => {
            if (!ctx.options) return;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const query = ctx.options.get("query")!;
            if (!query.value) return;
            const [name, link] = (query.value as string).split("~");
            if (!link) {
                findAndSend(ctx, name, DATA, true, 8);
                return;
            }
            ctx.editOrRespond({
                embed: {
                    description: `**[${name}](${DATA.baseLink}${link})**`,
                    footer: {
                        text: `Searched by ${ctx.interaction.user.username}`,
                        iconUrl: ctx.interaction.user.avatarUrl
                    },
                    color: 0x42ba96
                }
            });
        }
    });
    
    await commandClient.run();
})();

