
export interface MessageFinding {
    name: string,
    path?: Array<string>
}

export function parseMessage(msg: string) : Array<MessageFinding>|undefined {
    let ind = msg.indexOf("[[");
    if (ind === -1) return;
    const findings: Array<MessageFinding> = [];
    for (; ind !== -1; ind = msg.indexOf("[[", ind)) {
        const end = msg.indexOf("]]", ind);
        if (end === -1) break;
        const content = msg.slice(ind + 2, end);
        if (content.includes("/")) {
            const path = content.split("/");
            findings.push({ path, name: path.pop() as string });
        }
        else findings.push({ name: content });
        ind = end;
    }
    return findings;
}