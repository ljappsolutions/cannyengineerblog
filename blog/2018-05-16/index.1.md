---
date: "2018-05-16"
title: "Using Cognito, Angular and Node.js together (2/3)"
category: "AWS Tutorial"
tags: ['NODE.JS', 'COGNITO', 'COGNITO-EXPRESS', 'AWS', 'EXPRESS.JS']
banner: "/assets/2018-05-16/Cognito_NodeJS.png"
path: "/blog/using-cognito-angular-and-nodejs-together-2"
---

## Application configuration
**Objective**: Configure an angular application to authenticate Cognito users.

As prerequisites, we are using several npm packages, so please install the ones listed below:

* ngx-toastr: to show messages to the user.
* amazon-cognito-identity-js
* aws-sdk

### Configure application front-end
To secure the front-end application, we need to setup a couple of services and utilities first. Specifically, we will create:

* An authentication service that will validate if there is a valid session
* An authentication guard service that will be used by the Angular Router Module to allow requests
* A token interceptor to detect all HTTP requests and attach an authentication token. This same interceptor will analyze responses and if there is an error, it will redirect to an appropriate screen.
* A user service that will handle all the interactions with Cognito

The first authentication service uses a custom made Local Storage Service that is not shown in this tutorial, but basically, under the hood it will use some storage mechanism to persist the tokens and retrieve them.

The code for this service looks like this:

```js
import { AdminLocalStorageService } from "./admin-local-storage.service";
import { Injectable } from "@angular/core";

@Injectable()
export class AuthenticationService {
    constructor(
        private localStorage: AdminLocalStorageService) {
    }

    isAuthenticated(){
        var token = this.localStorage.getToken();
        return token != null;
    }
}
```

The authentication guard is a special class that implements the CanActivate class from the angular router modules. This service will use our authentication service to verify that the session tokens exist, and if these tokens are missing, it will redirect the user automatically to the login screen.

The code for this service looks like this:

```js
import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthenticationService } from './authentication.service';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class AuthGuardService implements CanActivate {

    constructor(private auth: AuthenticationService
        , private router: Router
        , private toastr: ToastrService) {}

    canActivate(): Promise<boolean> {
        return new Promise(resolve => {
            if(this.auth.isAuthenticated()){
                resolve(true);
            } else {
                this.toastr.error("Please login...", "Unauthorized");
                this.router.navigate(['/']);
                resolve(false);
            }
        });
    }
}
```

The token interceptor, as mentioned before, will be used by the application module to intercept all HTTP requests and attach the authentication token. Since we are doing authentication only, we are adding only one header to the requests that contains the ID token retrieved from Cognito.

The code for the interceptor looks like this:

```js
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { Router } from '@angular/router';
import 'rxjs/add/operator/do';

import { AuthenticationService } from './services/authentication.service';
import { AdminLocalStorageService } from './services/admin-local-storage.service';
import { ToastrService } from 'ngx-toastr';


@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(public auth: AuthenticationService
    , private localStorage: AdminLocalStorageService
    , private router: Router
    , private toastr: ToastrService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const authData = this.localStorage.getToken();
        let requestItem = request;
        if (authData) {
            requestItem = request.clone({
                headers: request.headers.set("Authorization",
                    authData.jwtToken)
            });
        }
        return next.handle(requestItem).do((event: HttpEvent<any>) => {
            if (event instanceof HttpResponse) {
              //letting it pass
            }
        }, (err: any) => {
            if (err instanceof HttpErrorResponse) {
                if (err.status === 401) {
                    this.localStorage.deleteToken();
                    this.toastr.error("Please login again.", "Session ended");
                    this.router.navigate(['/']);
                }
            }
        });
    }
}
```

Finally, the last service needs two classes, the service that will be doing the authentication and a utils class that will help processing classes and attributes for Cognito.

The Cognito utils class looks like this:

```js
import { IAuthenticationDetailsData, CognitoUserPool, CognitoUserAttribute, ICognitoUserAttributeData } from "amazon-cognito-identity-js";
import { environment } from "../../environments/environment";
import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { AttributeType } from "aws-sdk/clients/elb";

export class CognitoUtils {
    public static getAuthDetails(email: string, password: string): IAuthenticationDetailsData {
        return {
            Username: email,
            Password: password,
        };
    }

    public static getUserPool() {
        return new CognitoUserPool(environment.cognitoSettings);
    }

    public static getAttribute(attrs: CognitoUserAttribute[], name: string): CognitoUserAttribute {
        return attrs.find(atr => atr.getName() === name);
    }

    public static getAttributeValue(attrs: AttributeListType, name: string, defValue: any): string {
        const attr = attrs.find(atr => atr.Name === name);
        return attr ? attr.Value : defValue;
    }

    public static getActiveAttribute(attrs: AttributeListType): boolean {
        return CognitoUtils.getAttributeValue(attrs, 'custom:active', '1') === '1';
    }

    public static createNewUserAttributes(request): CognitoUserAttribute[] {
        const emailAttribute = new CognitoUserAttribute({Name : 'email', Value : request.email });
        const emailVerifiedAttribute = new CognitoUserAttribute({Name : 'email_verified', Value : 'true' });
        const activeAttribute = new CognitoUserAttribute({Name : 'custom:active', Value : (request.active ? 1 : 0).toString() });
        return [
            emailAttribute, activeAttribute
        ];
    }

    public static createUpdatableUserAttributesData(request): AttributeListType {
        const preferedUsername = {Name : 'preferred_username', Value : request.username };
        const emailAttribute = {Name : 'email', Value : request.email };
        const emailVerifiedAttribute = {Name : 'email_verified', Value : 'true' };
        const activeAttribute = {Name : 'custom:active', Value : (request.active ? 1 : 0).toString() };
        return [
            preferedUsername, emailAttribute, emailVerifiedAttribute,
            activeAttribute
        ];
    }
}
```

And the code for the service looks like this:

```js
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import 'rxjs/add/observable/from.js';
import { IntervalObservable } from 'rxjs/observable/IntervalObservable';
import { CognitoUserSession, CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import * as AWS from 'aws-sdk';
import { ListUsersRequest } from 'aws-sdk/clients/cognitoidentityserviceprovider';

import { environment } from '../../../environments/environment';
import { CognitoUtils } from '../cognitoUtils';
import { User } from '../models/user';
import { AdminLocalStorageService } from './admin-local-storage.service';

@Injectable()
export class UsersService {
    session: CognitoUserSession;
    cognitoAdminService: AWS.CognitoIdentityServiceProvider;
    userPool: CognitoUserPool;

    constructor(private http: HttpClient, private router: Router, private adminLocalStorage: AdminLocalStorageService) {
        this.cognitoAdminService = new AWS.CognitoIdentityServiceProvider({
            accessKeyId: environment.awsConfig.accessKeyId,
            secretAccessKey: environment.awsConfig.secretAccessKey,
            region: environment.awsConfig.region
        });
        this.userPool = CognitoUtils.getUserPool();
    }

    public login(login: string, password: string): Observable<User | false> {
        const cognitoUser = new CognitoUser(this.getUserData(login));
        cognitoUser.setAuthenticationFlowType('USER_PASSWORD_AUTH');
        const authenticationDetails = new AuthenticationDetails(CognitoUtils.getAuthDetails(login, password));
        return Observable.create(obs => {
            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: result => {
                    this.session = result;
                    const token = result.getIdToken();
                    const accessToken = result.getAccessToken();
                    this.adminLocalStorage.setToken(token);
                    this.adminLocalStorage.setAccessToken(accessToken);
                    this.router.navigate(['managereps']);
                },
                onFailure: err => {
                    console.error(err);
                    obs.next(false);
                },
                newPasswordRequired: (userAttributes, requiredAttributes) => {
                    this.router.navigate(['dashboard/login', { username: login }]);
                    obs.next(false);
                }
            });
        });
    }

    private getUserData(email: string) {
        return {
            Username: email,
            Pool: this.userPool
        };
    }

    public addUser(newUser: User): Observable<Object> {
        return Observable.create(obs => {
            const attrs = CognitoUtils.createNewUserAttributes(newUser);
            const cognitoUser = new CognitoUser(this.getUserData(newUser.username));
            this.userPool.signUp(newUser.username, newUser.password, attrs, [], (error, data) => {
                    if (error) {
                        console.error(error);
                        obs.next(false);
                        return;
                    }
                    this.cognitoAdminService.adminConfirmSignUp({
                        Username: newUser.username,
                        UserPoolId: this.userPool.getUserPoolId()
                    }, (e, d) => this.defaultAdminCallback(e, d, obs));
            });
        });
    }

    private defaultAdminCallback(error, data, obs, ok: any = true, no: any = false) {
        if (error) {
            console.error(error);
            obs.next(no);
            return;
        }
        obs.next(ok);
    }
}
```

As you can see, we have 2 main public methods, one for login and the other one to create users. The user class reference  above, it's just a class with 3 properties for username, password and email.

The login method is used in a login page that accepts the credentials used for authentication. And the addUser method is used in a sign up page for users. Both of these pages are not provided in this tutorial. 

Finally, we need to add the interceptor and the guard service to the application module. Note: since this tutorial was created using a small application, only the app module was created, however, the interceptor module must be applied in any module that the HTTPClientModule is imported and the guard must be applied in any routing configuration.

To apply the guard configuration in the module, we override the canActivate property for the routes as shown next:

```js
const routes: Routes = [
  {
    path: 'page1', component: Page1Component,
    canActivate: [AuthGuardService]
  },
  { path: '', component: LoginComponent }
];
```

For the interceptor, we need to add it to the providers property configuration as shown next:

```json
providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    },
    AdminLocalStorageService,
    AuthenticationService,
    AuthGuardService,
    UsersService
  ]
```

With this, the configuration for the angular application is complete, and it should be ready for testing. So, finish creating the login and sign up component and start authenticating users.

Continue with the third part of this tutorial [here](/blog/using-cognito-angular-and-nodejs-together-3)