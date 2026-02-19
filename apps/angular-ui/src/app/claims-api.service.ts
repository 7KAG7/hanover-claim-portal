import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type Lob = 'Personal Auto' | 'Homeowners' | 'Commercial';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export type Claim = {
  id: string;
  claimNumber: string;
  lob: Lob;
  policyNumber: string;
  insuredName: string;
  lossDate: string;
  lossType: string;
  description: string;
  contactEmail: string;
  priority: Priority;
  status: string;
};

export type CreateClaimInput = {
  lob: Lob;
  policyNumber: string;
  insuredName: string;
  lossDate: string;
  lossType: string;
  description: string;
  contactEmail: string;
  priority: Priority;
};

@Injectable({ providedIn: 'root' })
export class ClaimsApiService {
  private readonly baseUrl = 'http://localhost:3000';

  constructor(private readonly http: HttpClient) {}

  fetchClaims(): Observable<{ items: Claim[] }> {
    return this.http.get<{ items: Claim[] }>(`${this.baseUrl}/claims`);
  }

  createClaim(input: CreateClaimInput): Observable<Claim> {
    return this.http.post<Claim>(`${this.baseUrl}/claims`, input);
  }
}
