export namespace backend {
	
	export class ServerLock {
	    is_running: boolean;
	    hosted_by: string;
	    // Go type: time
	    hosted_at: any;
	    ip_address: string;
	
	    static createFrom(source: any = {}) {
	        return new ServerLock(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.is_running = source["is_running"];
	        this.hosted_by = source["hosted_by"];
	        this.hosted_at = this.convertValues(source["hosted_at"], null);
	        this.ip_address = source["ip_address"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ServerGroup {
	    id: string;
	    name: string;
	    type: string;
	    version: string;
	    invite_code: string;
	    owner_id: string;
	    owner: string;
	    members: string[];
	    lock: ServerLock;
	
	    static createFrom(source: any = {}) {
	        return new ServerGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.version = source["version"];
	        this.invite_code = source["invite_code"];
	        this.owner_id = source["owner_id"];
	        this.owner = source["owner"];
	        this.members = source["members"];
	        this.lock = this.convertValues(source["lock"], ServerLock);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ServerProps {
	    "max-players": string;
	    gamemode: string;
	    difficulty: string;
	    "white-list": boolean;
	    "online-mode": boolean;
	    pvp: boolean;
	    "enable-command-block": boolean;
	    "allow-flight": boolean;
	    "spawn-animals": boolean;
	    "spawn-monsters": boolean;
	    "spawn-npcs": boolean;
	    "allow-nether": boolean;
	    "force-gamemode": boolean;
	    "spawn-protection": string;
	
	    static createFrom(source: any = {}) {
	        return new ServerProps(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this["max-players"] = source["max-players"];
	        this.gamemode = source["gamemode"];
	        this.difficulty = source["difficulty"];
	        this["white-list"] = source["white-list"];
	        this["online-mode"] = source["online-mode"];
	        this.pvp = source["pvp"];
	        this["enable-command-block"] = source["enable-command-block"];
	        this["allow-flight"] = source["allow-flight"];
	        this["spawn-animals"] = source["spawn-animals"];
	        this["spawn-monsters"] = source["spawn-monsters"];
	        this["spawn-npcs"] = source["spawn-npcs"];
	        this["allow-nether"] = source["allow-nether"];
	        this["force-gamemode"] = source["force-gamemode"];
	        this["spawn-protection"] = source["spawn-protection"];
	    }
	}
	export class ServerVersion {
	    id: string;
	    version: string;
	    type: string;
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new ServerVersion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.version = source["version"];
	        this.type = source["type"];
	        this.url = source["url"];
	    }
	}

}

