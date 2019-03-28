---
date: "2018-04-29"
title: "Use AWS Fargate to deploy your Expressjs app (3/3)"
category: "AWS Tutorial"
tags: ['AWS', 'NODE.JS', 'EXPRESS.JS', 'FARGATE', 'DOCKER']
banner: "/assets/2018-04-29/DevOps-Gear.png"
path: "/blog/fargate-nodejs-express-docker-deployment-3"
---

### CodePipeline
**Objective**: create a CI/CD environment for a node.js + express application

AWS CodePipeline is a service to do CI/CD where you can visualize and automate all the steps required to release an application.

To understand how this service works, take a look at the following diagram:

![Pipeline Architecture Example](/assets/2018-04-29/PipelineArchitecture.PNG)

In general, a pipeline can be divided in 3 stages:

1. Source: this will be the repository where the code is stored and will trigger a run of the pipeline when a change is detected.
1. Build: the build stage prepares all the configuration needed before staging or deploying the code
1. Staging: the final stage deploys the application to the target location

Between each stage, an artifact is generated that will be used in the next stage as input. To store this artifacts temporarily, Amazon creates S3 buckets to pass the artifacts between each stage.

### Creating roles
As a prerequisite before creating the pipeline, we will need to create 2 IAM roles to execute the build portion of our pipeline and a lambda function that will be used to do some cleanup.

The first role to create will be the one using during the build phase. 

On the Amazon console, go to the Security section and click on IAM. On the left tab go to Roles and click on the create button.

Select AWS Service as the type of trusted entity and select CodeBuild as the service that will use the role.

![Role Creation Template](/assets/2018-04-29/PipelineCreateBuildRole.PNG)

In the next screen, we won't select any policy yet. We will let CodeBuild to create a policy and then modify it to have all the permissions required.

In the last screen, type the role name and a description for what the role will be used.

The second role to create will be the one used for the lambda functions, follow the same steps except that when selecting the service to use the role, select Lambda.

### Create Pipeline
The pipeline for our project will have 4 stages: source, build, staging and cleanup. 

To start creating the pipeline, in the Amazon console, go to the Developer Tools section, click on CodePipeline and then click on create pipeline.

In the first step, type a name for the pipeline.

![CodePipeline Creation Step 1](/assets/2018-04-29/PipelineCreatePipelineStep1.PNG)

### Configure Source
In the second step, select the source provider for the code. For this tutorial, we will be using CodeCommit, however it also supports github as provider.

After selecting CodeCommit as Source provider, type the repository and branch name that will be used. Amazon, automatically generates CloudWatch events that will trigger the pipeline when a change is detected, however, you can change the detection options to enable Pipeline to check for changes periodically.

![CodePipeline Creation Step 2](/assets/2018-04-29/PipelineCreatePipelineStep2.PNG)

### Configure Build
In the third step, select the build provider for building the containers.For this tutorial, we will be using CodeBuild, however it also supports Jenkins as a provider.

Create a new build project by marking the radio button on the screen, and type a name and description for the build project.

![CodePipeline Creation Step 3 Section 1](/assets/2018-04-29/PipelineCreatePipelineStep3Section1.PNG)

In the environment section, select to use an image managed by AWS CodeBuild. Search for Ubuntu as OS, Docker as Runtime and 17.09 as version. Also, leave the buildspec.yml as build specification. Note: if the yml file is named differently, still select this option and continue with the tutorial. But remember to go to the CodeBuild section in AWS and update the specification file name there.

![CodePipeline Creation Step 3 Section 2](/assets/2018-04-29/PipelineCreatePipelineStep3Section2.PNG)

For our application, the yml file will contain the following instructions:

```
version: 0.2
 
phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws --version
      - $(aws ecr get-login --region $AWS_DEFAULT_REGION --no-include-email)
      - REPOSITORY_URI=610373893044.dkr.ecr.us-east-1.amazonaws.com/owi-trainer
      - IMAGE_TAG=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
  build:
    commands:
      - echo Build started on `date`
      - echo Building the Docker image...   
      - docker build -t $REPOSITORY_URI:latest .
      - docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG
  post_build:
    commands:
      - echo Build completed on `date`
      - echo Pushing the Docker images...
      - docker push $REPOSITORY_URI:latest
      - docker push $REPOSITORY_URI:$IMAGE_TAG
      - echo Writing image definitions file...
      - printf '[{"name":"node","imageUri":"%s"}]' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json
      - echo Finish post build tasks
artifacts:
    files: imagedefinitions.json
```

This file will specify code build to do 3 phases:

1. In the pre_build, it will establish a connection with the ECR service and set some variables.
1. In the build, it will build the docker image from the code uploaded and create a new tag to handle the history of images.
1. In the post_build, it will push both image tags to the repository and write in the imagedefinitions.json file the name of the container that will handle the image created. Note: the imagedefintions.json file is an empty file in the code source.

The REPOSITORY_URI variable must be changed with the correct repository used and in line 24, change the word "node" for the correct name of the container.

Continuing with the build project, the cache and vpc section doesn't need to be configured for our use cases.

As for the service role, search for the role created and select it. Finally, click on Save Build Project. It will automatically create the build project and assign it to the current pipeline.

### Configure Deploy
In the fourth step, select Amazon ECS as the deployment provider for deploying the containers.

Then, in the section that appeared below, select the cluster and the service that will be used to run the tasks. Also, type in the image filename imagedefinitions.json, it's the file configured in the yml to indicate the image to use.

![CodePipeline Creation Step 4](/assets/2018-04-29/PipelineCreatePipelineStep4.PNG)

### Finish Setup
In the fifth step, select the role for CodePipeline if you have one created, if not, click on create role.

Finally, review all the changes done and click on create.

Next, we will update the policies for the CodeBuild role.

On the Amazon console, go to the Security section and click on IAM. On the left tab go to Roles and search for the role used in CodeBuild. 

In the details screen for the role, search for the policy created by CodeBuild under the permissions tab, and click on edit policy.

To edit the policy, you can use the visual editor or modify the json directly, either way, include the following actions:

* ecr:GetDownloadUrlForLayer
* ecr:BatchGetImage
* ecr:CompleteLayerUpload
* ecr:DescribeImages
* ecr:GetAuthorizationToken
* ecr:UploadLayerPart
* ecr:BatchDeleteImage
* ecr:InitiateLayerUpload
* ecr:BatchCheckLayerAvailability
* ecr:GetRepositoryPolicy
* ecr:PutImage

### Configure Cleanup
We'll now add the final phase of the CodePipeline.

In the Amazon console, go to the Compute section and click on Lambda. Then click on the create function button in the top right corner.

In the wizard displayed, select the Author from scratch template, type a function name, select node.js 8.10 as runtime environment and select the existing role created before to execute lambda function.

![Lambda Creation Template](/assets/2018-04-29/PipelineCreateLambdaFunction.PNG)

In the editor that will appear, the content of the index.js file should be the following:

```js
const _ = require('lodash');
const AWS = require('aws-sdk');

let config = {
  region: 'us-east-1',
  repo: 'owi-trainer'
}

exports.handler = (event, context) => {
    const ecr = new AWS.ECR({region: config.region})
    const pipeline = new AWS.CodePipeline();
    
    const jobId = event['CodePipeline.job']['id'];
    var putJobSuccess = function(message) {
        var params = {
            jobId: jobId
        };
        pipeline.putJobSuccessResult(params, function(err, data) {
            if(err) {
                context.fail(err);      
            } else {
                context.succeed(message);      
            }
        });
    };
    
    var putJobFailure = function(message) {
        var params = {
            jobId: jobId,
            failureDetails: {
                message: JSON.stringify(message),
                type: 'JobFailed',
                externalExecutionId: context.invokeid
            }
        };
        pipeline.putJobFailureResult(params, function(err, data) {
            if(err) context.fail(err.stack);
            else context.fail(message);
        });
    };
    
    ecr.describeImages({ repositoryName: config.repo, filter: { tagStatus: 'TAGGED'} }, function(err, data){
        console.log("Started");
        if (err){
          putJobFailure(err.stack);
        } else{
            var images = _.orderBy(data.imageDetails, ['imagePushedAt'], ['desc']);
            if(images.length > 3){
                var imagesToDelete = _.map(_.slice(images, 3), function(element){
                    return {
                        imageDigest: element.imageDigest
                    };
                });
                ecr.batchDeleteImage({ repositoryName: config.repo, imageIds: imagesToDelete }, function(err, data){
                    if(err){
                        putJobFailure(err.stack);
                    } else{
                        putJobSuccess("Removed " + imagesToDelete.length + " image(s)");
                    }
                });
            }else{
                putJobSuccess("Nothing to delete");
            }
        }
    });
};
```

This function will describe all the images existing in a repository and order them by the date it was pushed to the repository. If the length of those images is more than 3, it will delete the older images, otherwise, it won't do anything.

Click on save and now let's update the Lambda policy associated to the role.

On the Amazon console, go to the Security section and click on IAM. On the left tab go to Roles and click on the role.

In the details screen, search for the policy created by the Lambda function under the permissions tab, and click on edit policy.

Same as before, update the role using the visual editor or the json directly and include the following actions:

* ecr:DescribeImages
* ecr:DescribeRepositories
* ecr:BatchDeleteImage
* ecr:ListImages

Lastly, let's add the lambda function to the CodePipeline.

In the Amazon console, go to the Developer Tools section and click on CodePipeline. Search for the pipeline that was created and click on it to go to the details screen.

Click on edit and add a new stage at the end. Type a name for it, in our case: "CleanUp" and then add an action using the button right below the stage name.

In the right pane that will popup, select Invoke as Action Category, type an action name and select Lambda as the provider.

Then select the function you created in the AWS Lambda section that appeared and click on Add Action.

![Add Lambda Function to Pipeline](/assets/2018-04-29/PipelineAddLambdaFunctionToPipeline.PNG)

## Summary
After finishing all 3 parts of this tutorial, you should have completed the configuration to use Docker containers in AWS Datapipeline to deploy a node.js + express application.