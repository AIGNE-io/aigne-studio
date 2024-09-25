import Category from './category';
import Deployment from './deployment';
import DeploymentCategory from './deployment-category';
import Project from './project';

export function initModels() {
  Deployment.associate({ Category, DeploymentCategory, Project });
  Category.associate({ Deployment, DeploymentCategory });
  Project.associate({ Deployment });
}
