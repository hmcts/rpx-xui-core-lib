import { Injectable } from '@angular/core';

@Injectable()
export class FileUploadStateService {
    private readonly activeUploads = new Set<object>();
    private legacyUploadInProgress = false;

    public get uploadInProgress(): boolean {
        return this.legacyUploadInProgress || this.activeUploads.size > 0;
    }

    public set uploadInProgress(value: boolean) {
        this.setUploadInProgress(value);
    }

    public setUploadInProgress(value: boolean, owner?: object): void {
        if (owner !== undefined) {
            if (value) {
                this.activeUploads.add(owner);
            } else {
                this.activeUploads.delete(owner);
            }
            return;
        }

        this.legacyUploadInProgress = value;
        if (!value) {
            this.activeUploads.clear();
        }
    }

    public isUploadInProgress(): boolean {
        return this.uploadInProgress;
    }

    public beginUpload(owner: object): void {
        this.setUploadInProgress(true, owner);
    }

    public endUpload(owner: object): void {
        this.setUploadInProgress(false, owner);
    }
}
