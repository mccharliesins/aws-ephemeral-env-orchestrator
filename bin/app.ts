#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OrchestratorStack } from '../lib/orchestrator-stack';

const app = new cdk.App();

// main stack holding platform logic
// deploys api gateway, dynamodb, and lambda functions
new OrchestratorStack(app, 'EphemeralEnvOrchestratorStack', {
    // environment configuration here
});