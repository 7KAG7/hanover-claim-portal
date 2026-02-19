import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import {
  ClaimsApiService,
  type Claim,
  type CreateClaimInput,
  type Lob,
  type Priority,
} from './claims-api.service';

const LOBS: Lob[] = ['Personal Auto', 'Homeowners', 'Commercial'];
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
const lossDateNotInFuture: ValidatorFn = (
  control: AbstractControl<string>,
): ValidationErrors | null => {
  if (!control.value) return null;
  const lossDate = new Date(control.value + 'T00:00:00Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return lossDate > today ? { futureDate: true } : null;
};

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly api = inject(ClaimsApiService);
  private readonly fb = inject(FormBuilder);

  readonly lobs = LOBS;
  readonly priorities = PRIORITIES;

  claims: Claim[] = [];
  loading = true;
  saving = false;
  error: string | null = null;

  readonly form = this.fb.nonNullable.group({
    lob: this.fb.nonNullable.control<Lob>(LOBS[0]),
    policyNumber: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    insuredName: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    lossDate: this.fb.nonNullable.control('', [Validators.required, lossDateNotInFuture]),
    lossType: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(5)]),
    contactEmail: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    priority: this.fb.nonNullable.control<Priority>('MEDIUM'),
  });
  private readonly requiredMessage = 'This field is required.';

  ngOnInit(): void {
    this.api
      .fetchClaims()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.claims = data.items;
        },
        error: (err: unknown) => {
          this.error = this.getErrorMessage(err, 'Failed to load claims');
        },
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error = null;
    this.saving = true;

    const payload: CreateClaimInput = this.form.getRawValue();

    this.api
      .createClaim(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (created) => {
          this.claims = [created, ...this.claims];
          this.form.reset({
            lob: LOBS[0],
            policyNumber: '',
            insuredName: '',
            lossDate: '',
            lossType: '',
            description: '',
            contactEmail: '',
            priority: 'MEDIUM',
          });
        },
        error: (err: unknown) => {
          this.error = this.getErrorMessage(err, 'Failed to create claim');
        },
      });
  }

  isInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  fieldError(name: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[name];
    if (!this.isInvalid(name) || !control.errors) return null;

    if (control.errors['required']) return this.requiredMessage;
    if (control.errors['email']) return 'Enter a valid email address.';
    if (control.errors['futureDate']) return 'Loss date cannot be in the future.';
    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength as number;
      return `Must be at least ${min} characters.`;
    }

    return 'Invalid value.';
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as
        | { error?: string; message?: string; issues?: Array<{ message?: string }> }
        | undefined;
      if (body?.issues?.[0]?.message) return body.issues[0].message;
      if (body?.message) return body.message;
      if (body?.error) return body.error;
      if (err.status) return `${fallback} (${err.status})`;
    }
    return fallback;
  }
}
