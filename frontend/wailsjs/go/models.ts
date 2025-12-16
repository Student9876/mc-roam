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
	    owner_id: string;
	    members: string[];
	    lock: ServerLock;
	    invite_code: string;
	
	    static createFrom(source: any = {}) {
	        return new ServerGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.owner_id = source["owner_id"];
	        this.members = source["members"];
	        this.lock = this.convertValues(source["lock"], ServerLock);
	        this.invite_code = source["invite_code"];
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

}

