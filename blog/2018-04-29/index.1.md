---
date: "2018-04-29"
title: "Use AWS Fargate to deploy your Expressjs app (2/3)"
category: "AWS Tutorial"
tags: ['AWS', 'NODE.JS', 'EXPRESS.JS', 'FARGATE', 'DOCKER']
banner: "/assets/2018-04-29/DevOps-Gear.png"
path: "/blog/fargate-nodejs-express-docker-deployment-2"
---

### Fargate
**Objective**: configure the infrastructure used to host Docker containers in AWS

AWS Fargate is a technology that allows you to run applications without proviosining or manage the compute infrastructure. In other words, Fargate executes the instances without the user involvement. As of now, the only orchestration tool allowed is Amazon ECS, but there will be support for Kubernetes in the near future.

To understand how the infrastructure works, take a look at the following diagram:

![Fargate Infrastructure](/assets/2018-04-29/FargateECSObjects.PNG)

Amazon uses 4 objects to run Docker instances, starting from the center of the diagram:

1. Container: this object is the host that will "contain" the docker image. 
1. Task definition: the task definition defines from which docker image the instances will be created. Also, we can define here port mappings, volumes to access or environment variables that will be used by the container.
1. Service: the service is the master that controls the tasks that will be run by Fargate. We can determine from here the load balancer, the amount of tasks that will be executed and the auto scaling rules if needed.
1. Cluster: the final piece is the cluster, this is just a collection of services. It also manages the VPC used for the services.

The final piece that does not appear in the diagram is the ECR or Elastic Container Registry. This will be the repository used to store the images created by Docker and our first step in configuring all the infrastructure.

### Create Elastic Container Repository 
On the Amazon console, go to the compute section and click on Elastic Container Service. On the left tab go to Amazon ECR > Repositories and click on Create Repository.

In the wizard displayed, type the name of the repository

![ECR Repository Creation](/assets/2018-04-29/FargateCreateECRRepository.PNG)

After clicking "Next Step", the repository will be created and you will receive a success indicator.

![ECR Repository Creation Success](/assets/2018-04-29/FargateSuccessECRRepository.PNG)

Copy the repository URI created by amazon since we will be using this later when configuring the CodePipeline.

### Create Cluster
On the Amazon console, go to the compute section and click on Elastic Container Service. On the left tab go to Amazon ECS > Clusters and click on Create Cluster. Amazon provides a Wizard to create the whole infrastructure with just a few steps, however, at the time of creating this tutorial, the options provided were limited and other configurations needed to be done that required to recreate the objects individually.

In the wizard displayed, select the Networking only template (Powered by AWS Fargate) and click the next step button.

![Cluster Template](/assets/2018-04-29/FargateCreateClusterTemplate.PNG)

Type the name of the cluster and mark the checkbox to create the VPC. This VPC will be used by the load balancer.

![Cluster Creation Details](/assets/2018-04-29/FargateCreateClusterDetails.PNG)

Click on create and you will receive a success message indicating that the cluster has been created.

### Create Load Balancer
On the Amazon console, go to the computer section and click on EC2. On the left tab go to Load Balancing > Load Balancers and click on Create Load Balancer

In the wizard displayed, select the Application Load Balancer template and click on create.

![Load Balancer Template](/assets/2018-04-29/FargateLoadBalancerTemplate.PNG)

Type the name of the load balancer, make sure it's marked as internet-facing using ipv4 addresses. In the Listeners section you can include HTTPS protocol, by default it's not added. Note: if HTTPS is added, a certificate will be required later and this will not be covered in this tutorial.

Last, select the VPC created by the cluster in the dropdown at the bottom of the screen, and at least two subnets from it.

![Load Balancer Step 1](/assets/2018-04-29/FargateCreateLoadBalancerStep1.PNG)

We will skip step 2 since it's meant to configure HTTPS details. On step 3, we will select the security groups used by the load balancer. Selecting the default and the same security group created by the cluster is enough.

![Load Balancer Step 3](/assets/2018-04-29/FargateCreateLoadBalancerStep3.PNG)

On step 4, we will create a new target group. Indicate a name and the health check path, the rest of the parameters can be left as default. Note: the health check path must be a valid path of the service to be accessed, and it shouldn't have any authentication associated. As a recommendation, create a valid route called "health" that simply return a success message. If no health check is configured, or the path is not valid, Fargate will deregister the tasks marked as unhealthy for an amount of time.

![Load Balancer Step 4](/assets/2018-04-29/FargateCreateLoadBalancerStep4.PNG)

On step 5, we should register targets, but we don't have any yet, so we can leave this as it is and continue to the last step. 

On step 6, review that all the information displayed is correct, if not, make the corrections and come back to this step to finish.

Click on create and you will receive a success message indicating that the load balancer has been created.

### Create Task Definition and Container
On the Amazon console, go to the compute section and click on Elastic Container Service. On the left tab go to Amazon ECS > Task Definitions and click on the create button.

In the wizard displayed, select the Fargate template and click on next step.

![Task Definition Template](/assets/2018-04-29/FargateCreateTaskDefinitionTemplate.PNG)

In the next screen, under the first section, type the definition name and select the ecsTaskExecutionRole from the Task Role dropdown.

![Task Definition Details](/assets/2018-04-29/FargateCreateTaskDefinitionDetailsSection1.PNG)

Under the Task size section, select the amount of memory and number of CPUI used by the tasks. And in the container definitions subsection click on add container.

![Task Definition Details](/assets/2018-04-29/FargateCreateTaskDefinitionDetailsSection2.PNG)

In the container popup, type the name of the container, a base image, memory limits and port mappings.

![Task Definition Details](/assets/2018-04-29/FargateCreateTaskDefinitionContainer.PNG)

Review all the configuration done and click on create. You will receive a success message indicating that the task definition has been created.

### Create Service
Our last step in Fargate is to create the service that will run the tasks. 

On the Amazon console, go to the compute section and click on Elastic Container Service. On the left tab go to Amazon ECS > Clusters and click on the cluster created before. In the details screen displayed, under the Services tab, click on Create.

On the screen displayed, select Fargate as Launch Type, the task definition and cluster created before. Type a service name and 1 task only in the number of tasks input. Note: the number of tasks will be the number of instances run by Fargate.

![Service Creation Step 1](/assets/2018-04-29/FargateCreateServiceStep1.PNG)

After clicking on the next step button, you will configure the most critical parts of the service. Let's go section by section. 

In the VPC and Security groups, select the cluster VPC, all the subnets avaiable in the VPC and mark the auto-assign public IP as enabled.

![Service Creation Step 2 Section 1](/assets/2018-04-29/FargateCreateServiceStep2Section1.PNG)

In the Load Balancing section, select Application Load Balancer and search for the Load Balancer created before in the dropdown displayed. The section above (Health check grace period), will be enabled and you can type a grace period for the health check. Note: the health check grace period will determine, when using a load balancer, how much time Fargate will wait before terminating an unhealthy task and instantiate a new one.

![Service Creation Step 2 Section 2](/assets/2018-04-29/FargateCreateServiceStep2Section2.PNG)

In the Container to load balance section, click on the add to load balancer button. Select the port listener for port 80 and the targe group configured when creating the load balancer.

![Service Creation Step 2 Section 3](/assets/2018-04-29/FargateCreateServiceStep2Section2.PNG)

In the Service Discovery section, enable the service discovery integration, select to create a new private namespace and provide a name for it. 

Mark to create a new service discovery service and provide a name for it, and leave the Task Health Propagation checked.

![Service Creation Step 2 Section 4](/assets/2018-04-29/FargateCreateServiceStep2Section2.PNG)

For the last section of this screen, type the TTL value for DNS resolvers.

![Service Creation Step 2 Section 5](/assets/2018-04-29/FargateCreateServiceStep2Section2.PNG)

After all this configurations are done, click on Next Step. We will skip Step 3 since it configures auto scaling, and it won't be necessary for our application. In case you foresee that it will need this feature, set the rules to auto scale.

Finally, review all the configuration done and click on create. You will receive a success message indicating that the service has been created.

Continue with the third part of this tutorial [here](/blog/fargate-nodejs-express-docker-deployment-3)