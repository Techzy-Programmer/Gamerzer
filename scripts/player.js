export class Player {
    status = '';
    name = '';
    id = -1;

    constructor(plrId, plrName, plrStatus) {
        this.status = plrStatus;
        this.name = plrName;
        this.id = plrId;
    }
}
