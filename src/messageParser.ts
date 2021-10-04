
export interface MessageFinding {
    name: string,
    path?: Array<string>,
    member?: string,
    exact?: boolean
}

export function parseMessage(msg: string) : Array<MessageFinding>|undefined {
    let ind = msg.indexOf("[[");
    if (ind === -1) return;
    const findings: Array<MessageFinding> = [];
    for (; ind !== -1; ind = msg.indexOf("[[", ind)) {
        const end = msg.indexOf("]]", ind);
        let exact = false;
        if (end === -1) break;
        let name = msg.slice(ind + 2, end);
        if (name[0] === "~") {
            name = name.slice(1);
            exact = true;
        }
        let path;
        let member;
        if (name.includes("/")) {
            path = name.split("/");
            name = path.pop() as string;
        }
        if (name.includes(".")) {
            const [newName, newMember] = name.split(".");
            name = newName;
            member = newMember;
        }
        findings.push({ name, path, member, exact });
        ind = end;
    }
    return findings;
}
