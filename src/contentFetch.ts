/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */

import fetch from "node-fetch";
import path from "path";
import { MessageFinding } from "./messageParser";
import fuzzy from "fuzzysort";

export type PackedSearchData = [
    Array<[
        number, // Module ID,
        Array<[string, Array<[string, number, string|undefined]>, Array<[string, number, string|undefined]>, Array<number>, string|undefined]>, // Classes
        Array<[string, Array<string>, Array<number>, string|undefined]>, // Interfaces,
        Array<[string, Array<string>, Array<number>, string|undefined]>, // Enums,
        Array<[string, Array<number>]>, // Types
        Array<[string, Array<number>]>, // Functions
        Array<[string, Array<number>]> // Constants
    ]>,
    Array<string> // Module names
];

const enum SearchResultType {
    Class,
    Interface,
    Enum,
    Function,
    Constant,
    Type,
    Property,
    InterfaceProperty,
    Method,
    EnumMember
}

const resultTypeToString = {
    0: "class",
    1: "interface",
    2: "enum",
    3: "function",
    4: "constant",
    5: "type",
    6: "class",
    7: "interface",
    8: "class",
    9: "enum"
};

export interface SearchData {
    name: string,
    type: SearchResultType,
    comment?: string,
    parentName?: string,
    path: Array<number>,
    prepared: Fuzzysort.Prepared,
    preparedWithParent?: Fuzzysort.Prepared
}

export interface LibData {
    items: Array<SearchData>,
    members: Array<SearchData>,
    all: Array<SearchData>,
    moduleNames: Array<string>,
    baseLink: string
}

export async function fetchContent(base: string) : Promise<LibData> {
    const req = await fetch(path.join(base, "assets", "search.json"));
    const items: LibData["items"] = [];
    const members: LibData["members"] = [];
    const [modules, moduleNames] = await req.json() as PackedSearchData;
    for (const module of modules) {
        for (const cl of module[1]) {
            items.push({
                name: cl[0],
                path: cl[3],
                prepared: fuzzy.prepare(cl[0])!,
                comment: cl[4],
                type: SearchResultType.Class
            });
            for (const prop of cl[1]) members.push({name: prop[0], path: cl[3], parentName: cl[0], type: SearchResultType.Property, prepared: fuzzy.prepare(prop[0])!, preparedWithParent: fuzzy.prepare(`${cl[0]}.${prop[0]}`), comment: prop[2]});
            for (const method of cl[2]) members.push({name: method[0], path: cl[3], parentName: cl[0], type: SearchResultType.Method, prepared: fuzzy.prepare(method[0])!, preparedWithParent: fuzzy.prepare(`${cl[0]}.${method[0]}`), comment: method[2]});
        }
        for (const intf of module[2]) {
            items.push({
                name: intf[0],
                path: intf[2],
                prepared: fuzzy.prepare(intf[0])!,
                comment: intf[3],
                type: SearchResultType.Interface
            });
            for (const prop of intf[1]) members.push({name: prop[0], path: intf[2], parentName: intf[0], type: SearchResultType.InterfaceProperty, prepared: fuzzy.prepare(prop[0])!, preparedWithParent: fuzzy.prepare(`${intf[0]}.${prop[0]}`)});
        }
        for (const en of module[3]) {
            items.push({
                name: en[0],
                path: en[2],
                prepared: fuzzy.prepare(en[0])!,
                comment: en[3],
                type: SearchResultType.Enum
            });
            for (const member of en[1]) members.push({name: member[0], path: en[2], parentName: en[0], type: SearchResultType.EnumMember, prepared: fuzzy.prepare(member[0])!, preparedWithParent: fuzzy.prepare(`${en[0]}.${member[0]}`)});
        }
        for (const type of module[4]) items.push({ name: type[0], path: type[1], type: SearchResultType.Type, prepared: fuzzy.prepare(type[0])!});
        for (const fn of module[5]) items.push({ name: fn[0], path: fn[1], type: SearchResultType.Function, prepared: fuzzy.prepare(fn[0])!});
        for (const constant of module[6]) items.push({ name: constant[0], path: constant[1], type: SearchResultType.Constant, prepared: fuzzy.prepare(constant[0])!});
    }
    return {
        items,
        members,
        moduleNames,
        baseLink: base,
        all: [...items, ...members]
    };
} 

export interface ExtraSearchData {
    obj: SearchData,
    fullLink: string,
    highlighted: string|null
}

export function findInData(query: MessageFinding, data: LibData, settings: {
    highlight?: string,
    limit?: number,
    threshold?: number
}) : Array<ExtraSearchData>|undefined {
    if (!query.name.trim()) return;
    let searchData = data.items;
    let searchKey = "prepared";
    let searchTerm = query.name;
    if (query.member) {
        searchData = data.members;
        searchKey = "preparedWithParent";
        searchTerm = `${query.name}.${query.member}`;
    }
    const res = fuzzy.go(searchTerm, searchData, {
        key: searchKey,
        allowTypo: true,
        limit: settings.limit || 10,
        threshold: settings.threshold ?? -2000
    });
    return res.map(result => ({
        obj: result.obj,
        fullLink: `${data.baseLink}/${result.obj.path.map(p => `m.${data.moduleNames[p]}`).join("/")}/${resultTypeToString[result.obj.type]}/${result.obj.parentName ? `${result.obj.parentName}.html#.${result.obj.name}`:`${result.obj.name}.html`}`,
        highlighted: settings.highlight ? fuzzy.highlight(result, settings.highlight, settings.highlight) : null
    }));
}