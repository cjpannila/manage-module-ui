import {Injectable, Inject} from '@angular/core';
import {Headers, RequestOptions, Http, Response} from "@angular/http";
import {Subject, BehaviorSubject, Observable} from "rxjs";
import {MessageService} from "../commons/services/message.service";
import {SlimLoadingBarService} from "ng2-slim-loading-bar";
import {
    ApprovalHistory, ApprovalHistoryFilter, ApprovalHistoryDataset,
    Application, ApplicationHistory
} from "../commons/models/reporing-data-models";
import {AuthenticationService} from '../commons/services/authentication.service';

@Injectable()
export class ReportingRemoteDataService {

    /**
     * Subscribers stream
     * @type {BehaviorSubject<string[]>}
     */
    public SubscribersProvider: Subject<string[]> = new BehaviorSubject<string[]>([]);

    /**
     * Operators Stream
     * @type {BehaviorSubject<string[]>}
     */
    public OperatorsProvider:Subject<string[]> = new BehaviorSubject<string[]>([]);

    /**
     * Applications Stream
     * @type {BehaviorSubject<any[]>}
     */
    public ApplicationsProvider:Subject<Application[]> = new BehaviorSubject<Application[]>([])

    public ApplicationDetailProvider:Subject<ApplicationHistory[]> = new BehaviorSubject<ApplicationHistory[]>([]);

    /**
     * Approval History stream
     * @type {BehaviorSubject<ApprovalHistory[]>}
     */
    public ApprovalHistoryProvider:Subject<ApprovalHistoryDataset> = new BehaviorSubject<ApprovalHistoryDataset>(null);

    private headers: Headers = new Headers({'Content-Type': 'application/json'});

    private options: RequestOptions = new RequestOptions({headers: this.headers});

    private url = new URL(window.location.href);
    private apiContext = this.url.protocol + '//' + this.url.host + '/workflow-service/workflow/history';

    private apiEndpoints: Object = {
        subscribers: this.apiContext + '/subscribers',
        operators : this.apiContext + '/operators',
        approvalHistory : this.apiContext + '/approval',
        applications : this.apiContext + '/applications',
    };

    constructor(private http: Http,
                private message: MessageService,
                private slimLoadingBarService: SlimLoadingBarService,
                private authService: AuthenticationService) {
    }

    getApplicationDetail (id: number, callback: Function) {
        this.http.get(this.apiEndpoints['approvalHistory'] + '/' + id, this.getOptions())
            .map((response: Response) => response.json())
            .subscribe(
                (applications:ApplicationHistory[]) => {
                    this.ApplicationDetailProvider.next(applications);
                    callback(applications, true);
                },
                (error) => {
                    this.message.error(error);
                    callback(error, false);
                }
            );
    }

    getSubscribers() {
        this.slimLoadingBarService.start();
        this.http.get(this.apiEndpoints['subscribers'], this.getOptions())
            .map((response: Response) => response.json())
            .subscribe(
                (subscribers) => {
                    this.SubscribersProvider.next(subscribers)
                },
                (error) => {
                    this.message.error(error);
                    this.slimLoadingBarService.complete();
                },
                () => {
                    this.slimLoadingBarService.complete()
                }
            )
    }

    getOperators(){
        this.slimLoadingBarService.start();
        this.http.get(this.apiEndpoints['operators'], this.getOptions())
            .map((response: Response) => response.json())
            .subscribe(
                (operators) => {
                    this.OperatorsProvider.next(operators)
                },
                (error) => {
                    this.message.error(error);
                    this.slimLoadingBarService.complete();
                },
                () => {
                    this.slimLoadingBarService.complete()
                }
            )
    }

    getApplicationsBySubscriber(subscriber:string){
        if(!!subscriber){
            this.slimLoadingBarService.start();
            this.http.get(this.apiEndpoints['applications']+'/'+subscriber, this.getOptions())
                .map((response: Response) => response.json())
                .subscribe(
                    (applications:Application[]) => {
                        this.ApplicationsProvider.next(applications)
                    },
                    (error) => {
                        this.message.error(error);
                        this.slimLoadingBarService.complete();
                    },
                    () => {
                        this.slimLoadingBarService.complete()
                    }
                )
        }else{
            this.ApplicationsProvider.next([]);
        }

    }

    getApprovalHistory(approvalHistoryFilter:ApprovalHistoryFilter){
        let filter:ApprovalHistoryFilter = Object.assign({},approvalHistoryFilter);
        this.slimLoadingBarService.start();

        if(!!!filter.subscriber){
            filter.subscriber = '__ALL__';
        }

        if(!!!filter.operator){
            filter.operator = '__ALL__';
        }

        this.http.post(this.apiEndpoints['approvalHistory'], filter, this.getOptions())
            .map((response: Response) => response.json())
            .flatMap((res)=>{return Observable.from(res)})
            .reduce((arr:ApprovalHistoryDataset,cur)=>{
                if(cur.length == 1){
                    arr.noOfRecords = cur[0];
                }else{
                    let tmp:ApprovalHistory = new ApprovalHistory();
                    tmp.applicationId = cur[0];
                    tmp.applicationName= cur[1];
                    tmp.applicationDescription= cur[2];
                    tmp.status= cur[3];
                    tmp.approvedOn = cur[4];
                    arr.recordsCol.push(tmp);
                }
                return arr;
            },new ApprovalHistoryDataset())
            .subscribe(
                (approvalHistory) => {
                    this.ApprovalHistoryProvider.next(approvalHistory)
                },
                (error) => {
                    this.message.error(error);
                    this.slimLoadingBarService.complete();
                },
                () => {
                    this.slimLoadingBarService.complete();
                }
            )
    }

    getOptions(): RequestOptions {
        const token = this.authService.loginUserInfo.getValue().token;
        const headers = new Headers(
            {
                'Authorization': 'Basic ' + token,
                'Content-Type': 'application/json'
            });
        return new RequestOptions({headers: headers});
    }

}
