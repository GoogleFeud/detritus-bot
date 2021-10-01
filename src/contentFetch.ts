/* eslint-disable @typescript-eslint/no-unused-vars */

import fetch from "node-fetch";
import path from "path";
import { MessageFinding } from "./messageParser";

export type PackedSearchData = [
    Array<[
        number, // Module ID,
        Array<[string, Array<[string, number, string|undefined]>, Array<[string, number, string|undefined]>, Array<number>]>, // Classes
        Array<[string, Array<string>, Array<number>]>, // Interfaces,
        Array<[string, Array<string>, Array<number>]>, // Enums,
        Array<[string, Array<number>]>, // Types
        Array<[string, Array<number>]>, // Functions
        Array<[string, Array<number>]> // Constants
    ]>,
    Array<string> // Module names
];


export interface PartialModule {
    classes: Map<string, {
        path: string,
        methods: Map<string, string|undefined>,
        properties: Map<string, string|undefined>
    }>,
    interfaces: Map<string, string>,
    enums: Map<string, string>,
    types: Map<string, string>,
    functions: Map<string, string>,
    constants: Map<string, string>
}

export interface LibData {
    modules: Array<PartialModule>,
    baseLink: string
}

export async function fetchContent(base: string) : Promise<LibData> {
    const req = await fetch(path.join(base, "assets", "search.json"));
    const res: LibData["modules"] = [];
    const [modules, moduleNames] = await req.json() as PackedSearchData;
    for (const module of modules) {
        res.push({
            classes: new Map(module[1].map(([name, props, methods, numPath]) => [name, {
                path: numPath.map(num => `m.${moduleNames[num]}`).join("/"),
                methods: new Map(methods.map(m => [m[0], m[2]])),
                properties: new Map(props.map(m => [m[0], m[2]]))
            }])),
            interfaces: new Map(module[2].map(([name, _props, numPath]) => [name, numPath.map(num => `m.${moduleNames[num]}`).join("/")])),
            enums: new Map(module[3].map(([name, _members, numPath]) => [name, numPath.map(num => `m.${moduleNames[num]}`).join("/")])),
            types: new Map(module[4].map(([name, numPath]) => [name, numPath.map(num => `m.${moduleNames[num]}`).join("/")])),
            functions: new Map(module[5].map(([name, numPath]) => [name, numPath.map(num => `m.${moduleNames[num]}`).join("/")])),
            constants: new Map(module[6].map(([name, numPath]) => [name, numPath.map(num => `m.${moduleNames[num]}`).join("/")]))
        });
    }
    return {
        modules: res,
        baseLink: base
    };
} 

export function findInData(query: MessageFinding, data: LibData) : string|[string, string|undefined]|undefined {
    for (const mod of data.modules) {
        const classVal = mod.classes.get(query.name);
        if (classVal) {
            if (query.member) {
                if (classVal.properties.has(query.member)) return [`${data.baseLink}/${classVal.path}/class/${query.name}.html#.${query.member}`, classVal.properties.get(query.member)];
                if (classVal.methods.has(query.member)) return [`${data.baseLink}/${classVal.path}/class/${query.name}.html#.${query.member}`, classVal.methods.get(query.member)];
            }
            return `${data.baseLink}/${classVal.path}/class/${query.name}.html`;
        }
        const interVal = mod.interfaces.get(query.name);
        if (interVal) return `${data.baseLink}/${interVal}/interface/${query.name}.html${query.member ? `#.${query.member}`:""}`;
        const enumVal = mod.enums.get(query.name);
        if (enumVal) return `${data.baseLink}/${enumVal}/enum/${query.name}.html${query.member ? `#.${query.member}`:""}`;
        const typeVal = mod.types.get(query.name);
        if (typeVal) return `${data.baseLink}/${typeVal}/type/${query.name}.html`;
        const constVal = mod.constants.get(query.name);
        if (constVal) return `${data.baseLink}/${constVal}/constant/${query.name}.html`;
        const funVal = mod.functions.get(query.name);
        if (funVal) return `${data.baseLink}/${funVal}/function/${query.name}.html`;
    }
    return;
}