---
date: "2018-04-29"
title: "Use AWS Fargate to deploy your Expressjs app (1/3)"
category: "AWS Tutorial"
tags: ['AWS', 'NODE.JS', 'EXPRESS.JS', 'FARGATE', 'DOCKER']
banner: "/assets/2018-04-29/DevOps-Gear.png"
path: "/blog/fargate-nodejs-express-docker-deployment-1"
---

The following guide helps you to configure CodePipeline services in AWS to run Docker containers for an ExpressJS application. The whole process can be divided in 3 phases, which are: 

1. Docker
    1. Create Docker account
    1. Install Docker CE
    1. Download Docker Image
    1. Write Docker File
    1. Build and Run Docker Container
    1. Cleanup
1. Fargate
    1. Create Elastic Container Repository
    1. Create Cluster
    1. Create Load Balancer
    1. Create Task Definition and Container
    1. Create Service
1. CodePipeline
    1. Creating roles
    1. Create pipeline
    1. Configure source
    1. Configure build
    1. Configure deploy
    1. Finish setup
    1. Configure cleanup

## Docker
**Objective**: write a Dockerfile which will be used to create each container in CodePipeline

### Create Docker account
To create a docker account, navigate to [https:/hub.docker.com/](https:/hub.docker.com/) and fill the requested information.

![Docker Sign In Form Page](/assets/2018-04-29/DockerHubSignIn.PNG)

### Install Docker CE
After the account has been created, download Docker CE for your platform from this link: 
[https://www.docker.com/get-docker](https://www.docker.com/get-docker). This tutorial does not depend on any platform used for development.

When the download has finished, it would take a couple of minutes to install it, and it will prompt you to restart the computer.

### Download Docker Image
After installing Docker, use any Command Prompt to execute commands in Docker. The first one that we will run is to verify that the installation was completed successfully using "docker version"; if everything went good, it should show an output similar to this:

![Docker Version](/assets/2018-04-29/DockerVersion.PNG)

Then, to run Docker locally with our application, we will need to download an image using the following command: "docker pull [docker-image]" where you can replace the docker-image tag for the image version that is currently in LTS. When writing this tutorial, the current image version is "node:8.11.1-alpine". The alpine keyword is a flavor of the multiple versions of node for a particular version, others are slim, carbon and wheezy; they all differ in the tools installed by default or the Linux version used to create the image. For the Alpine version, it's based in Alpine Linux which is much smaller than others.

After running the command, the prompt will be updated with 3 bars that indicate the progress of the download and when finished, it will look like this:

![Docker Pull Image](/assets/2018-04-29/DockerImageDownload.PNG)

### Write Docker file
The Dockerfile is used by Docker to build a container. Once a build task is executed by Docker, it will read the image used as base (the one we downloaded before), setup environment variables like the port in which the service will run, copy all the files used by the application and run commands to prepare the application.

For our project, the contents of the Dockerfile are the following:

```
# Base Image
FROM node:8.11.1-alpine
 
# Environment variables
ENV PORT=80
ENV NODE_ENV=PROD
 
# Files to copy
COPY /helpers /src/helpers
COPY /repData /src/repData
COPY /routes /src/routes
COPY app.js /src/
COPY package-lock.json /src/
COPY package.json /src/
 
# Commands
RUN cd /src; npm install
CMD [ "node", "/src/app.js" ]
```

### Build and Run Docker Container
Now that everything has been configured, we can build the docker image and run it locally. For that, we will use two commands:

* "docker build -t [image-name] ." (Notice the dot at the end)
    * Replace the tag image-name with a meaningful name, this will be name used to create the image with the application dockerized.

![Docker Build Image](/assets/2018-04-29/DockerBuild.PNG)

* "docker run -p 80:80 --name [container-name] [image-name]"
    * Replace the tag image-name with the name typed before
    * Replace the tag [container-name] with a name that will be used to reference the docker container once it's running.

![Docker Run Image](/assets/2018-04-29/DockerRun.PNG)

After the container is running, you can access the service by accessing localhost from any browser. 

### Cleanup
After we have successfully created the Dockerfile, build a container and tested that the application runs without problem, we need to clean up the local environment. For that, we will use the following commands:

1. "docker ps -a": this command will list all the containers. Look at the ContainerId column and search for the container that you want to remove.
1. "docker stop [container-id]": this command will stop the container, replace the tag [container-id] with the container id found in the previous command. Note: docker does not need the full identifier. If the 3 first characters are unique in the containers, that's enough for it to recognize which contianer to stop.
1. "docker rm [container-id]": this command will remove the container, same as before, replace the tag [container-id].
1. "docker images": this command will list all the images existing locally. There should be at least 2 images: the base image and the one we created. Look at the ImageId column and search for the image that you want to remove.
1. "docker rmi [image-id]": this command will remove the image we indicate, replace the tag [image-id] with the image id found in the previous command. Note: same concept as container-id applies for the image-id tag

Continue with the second part of this tutorial [here](/blog/fargate-nodejs-express-docker-deployment-2)