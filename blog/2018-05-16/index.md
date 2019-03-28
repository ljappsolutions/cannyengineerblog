---
date: "2018-05-16"
title: "Using Cognito, Angular and Node.js together (1/3)"
category: "AWS Tutorial"
tags: ['NODE.JS', 'COGNITO', 'COGNITO-EXPRESS', 'AWS', 'EXPRESS.JS']
banner: "/assets/2018-05-16/Cognito_NodeJS.png"
path: "/blog/using-cognito-angular-and-nodejs-together-1"
---

Today, I'm writing a new tutorial after two weeks of continuing working on AWS. However, this time I'm going to dive a little bit more on development than the last time. 

This time, I would like to explain how to use Cognito, Angular and Node.js together. The first one to be used as user and access management system, Angular as the framework for the front end application, and obviously, Node.js as a backend service using Express.js also.

## Cognito
**Objective**: create a user pool to sign-up and authenticate users

The first thing we need to configure is a User Pool that will be used as a user directory. This directory will allow us sign up and sign in users. 

User Pools also provide integration with third party providers such as Facebook, Google, Amazon, and Microsoft Active Directory.

In this tutorial, we won't enable third party integration with any provider. Our user pool will contain our users and some information such as the email, user name, password and an active indicator.

### Creating the user pool
On the Amazon console, go to the Security section and click on Cognito. On the screen that appears, click on "Manage User Pools" and then "Create User Pool".

Right after, the first step is to type the name of the user pool. 

![User Pool Creation - Type Name](/assets/2018-05-16/UserPool-Name.PNG)

After typing the name, click on the "Step Through Settings" option, we will go step by step through all the configuration.

The next section will ask us to select the attributes for our users. In there, select the option to use an username to sign up and sign in, and mark the check boxes to sign in with a verified email address and preferred username. This two options will provide flexibility for our end users and validate that they are using valid email addresses.

![User Pool Creation - Attributes](/assets/2018-05-16/UserPool-AttributesSection1.PNG)

Below this section, you can add more attributes that will be used for the user profile, for example zip code, among others. Also, there is the possibility to add custom attributes that are not supported out of the box.

Continuing with the wizard, the next section that we will configure are the policies. These policies will specify the level of security of the password, for our case we will leave all options by default.

Also, we will allow users to sign themselves in the User Pool. Note: This is important, if we allow only administrators to create users, Amazon leaves users with a FORCE_CHANGE_PASSWORD state that is not easily changed, therefore, we will use the AWS SDK later to add users manually without the console.

![User Pool Creation - Policies](/assets/2018-05-16/UserPool-Policies.PNG)

Continue with the wizard and in the MFA and Verification section, create a role that will be used automatically by AWS to send SMS messages. Even though this is not going to be used in our tutorial, it's better to set this up right away. Note: the role created here is not the same to the roles we can assign to our users. To assign roles to a user, first you must create a group after the user pool is created, and assign roles to that group. Then, all the users that belongs to a particular group, will inherit those roles.

![User Pool Creation - MFA and Verifications](/assets/2018-05-16/UserPool-MFAVerifications.PNG)

The rest of the options were left with the default values. Continuing with the wizard, we only have two more sections that we are interested in. Navigate until reaching the Message Customizations section and change the verification type radio button to use links instead of codes. The only difference you will see is that the emails sent to users will contain a Url to verify the account, instead of using a pass code to be validated somewhere else (this will make the signup process much faster).

![User Pool Creation - Message Customizations](/assets/2018-05-16/UserPool-MessageCustomizations.PNG)

Finally, navigate to the App Client section in the wizard, this will be a key part in the creation of the user pool because this will provide us the identification keys that our application will use to validate users.

Click on Create App Client and type a client name. Leave the Generate Client Secret unchecked, otherwise authentication does not work as expected. Besides, mark the enable username-password for app-based authentication, this feature allows our application to use a combination of username and password to authenticate our users. Click again on Create App Client and finish creating the user pool. Note: the last section of the wizard will show a review of all the configurations added through the wizard, if there is something that needs to be changed, change it now. 

![User Pool Creation - App Client](/assets/2018-05-16/UserPool-AppClient.PNG)

Continue with the second part of this tutorial [here](/blog/using-cognito-angular-and-nodejs-together-2)