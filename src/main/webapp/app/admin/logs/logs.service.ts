import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { SERVER_API_URL } from '../../app.constants';

import { Log } from './log.model';

@Injectable({ providedIn: 'root' })
export class LogsService {
    constructor(private http: HttpClient) {}

    changeLevel(log: Log): Observable<HttpResponse<void>> {
        return this.http.put<void>(SERVER_API_URL + 'management/logs', log, { observe: 'response' });
    }

    findAll(): Observable<HttpResponse<Log[]>> {
        return this.http.get<Log[]>(SERVER_API_URL + 'management/logs', { observe: 'response' });
    }
}
