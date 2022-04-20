import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  MatSnackBar,
} from '@angular/material/snack-bar';

@Component({
  selector: 'app-application-form',
  templateUrl: './application-form.component.html',
  styleUrls: ['./application-form.component.css']
})
export class ApplicationFormComponent {

  constructor(
    public dialogRef: MatDialogRef<ApplicationFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ApplicationFormData,
    private _snackBar: MatSnackBar) { }

  onNoClick(): void {
    this.dialogRef.close();
  }

  apply(): void {
    if (this.data.email != '' && this.data.password != '' && this.data.region != '') {
      this.dialogRef.close(this.data);
    } else {
      this._snackBar.open('Missing parameters', undefined,
        {
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          duration: 1500
        });
    }
  }

  forgotPassword() {
    this.dialogRef.close({
      email: '',
      password: '',
      region: ''
    });
  }

}

export type ApplicationFormData = {
  email: string;
  password: string;
  region: string;
}