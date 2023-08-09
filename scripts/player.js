export class Player {
    session = 'N/A';
    isSelf = false;
    status = '';
    name = '';
    id = '';

    constructor(plrId, plrName, plrStatus, isMe = false) {
        this.status = plrStatus;
        this.name = plrName;
        this.isSelf = isMe;
        this.id = plrId;
    }

    setSession(sessStr) {
        localStorage.setItem('User-Session', sessStr);
        this.session = sessStr;
    }
}
