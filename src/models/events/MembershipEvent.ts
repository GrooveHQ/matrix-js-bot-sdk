import { StateEvent } from "./RoomEvent";
import { InvalidEventError } from "./InvalidEventError";

/**
 * The types of membership that are valid in Matrix.
 * @category Matrix event info
 * @see MembershipEventContent
 */
export type Membership = "join" | "leave" | "ban" | "invite";

/**
 * The content definition for m.room.member events
 * @category Matrix event contents
 * @see MembershipEvent
 */
export interface MembershipEventContent {
    avatar_url?: string;
    displayname?: string;
    membership: Membership;
    is_direct?: boolean;
    unsigned?: any;
    third_party_invite?: {
        display_name: string;
        signed: any;
    };
}

/**
 * Represents an m.room.member state event
 * @category Matrix events
 */
export class MembershipEvent extends StateEvent<MembershipEventContent> {
    constructor(event: any) {
        super(event);
    }

    /**
     * The user ID the membership affects.
     */
    public get membershipFor(): string {
        return this.stateKey;
    }

    /**
     * The user's membership.
     */
    public get membership(): Membership {
        const membership = this.content.membership;
        if (!membership) throw new InvalidEventError("no membership field in content");
        return membership;
    }
}
