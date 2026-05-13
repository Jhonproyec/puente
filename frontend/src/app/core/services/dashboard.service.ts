import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  readonly BASE_URL = environment.BASE_URL;
  
  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) { }


}