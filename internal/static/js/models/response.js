export class File {
    constructor({
        id = '',
        name = '',
        size = 0,
        mime = '',
        createdAt = null,
        updatedAt = null,
        isProtected = false,
        ...meta
    } = {}) {
        this.id = id;
        this.name = name;
        this.size = Number(size);
        this.mime = mime;
        this.createdAt = createdAt ? new Date(createdAt) : null;
        this.updatedAt = updatedAt ? new Date(updatedAt) : null;
        this.isProtected = Boolean(isProtected);
        this.meta = meta;
    }
}

export class Folder {
    constructor({
        id = '',
        name = '',
        itemsCount = 0,
        createdAt = null,
        updatedAt = null,
        isProtected = false,
        ...meta
    } = {}) {
        this.id = id;
        this.name = name;
        this.itemsCount = Number(itemsCount);
        this.createdAt = createdAt ? new Date(createdAt) : null;
        this.updatedAt = updatedAt ? new Date(updatedAt) : null;
        this.isProtected = Boolean(isProtected);
        this.meta = meta;
    }
}

export default class FolderContentResponse {
    constructor({ files = [], folders = [], isProtected = false } = {}) {
        this.files = (files || []).map(f => new File(f));
        this.folders = (folders || []).map(d => new Folder(d));
        this.isProtected = Boolean(isProtected);
    }

    static fromJSON(json) {
        if (typeof json === 'string') json = JSON.parse(json);
        return new FolderContentResponse(json || {});
    }
}