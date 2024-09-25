import Category from './category';
import Deployment from './deployment';
import DeploymentCategory from './deployment-category';

export function initModels() {
  Deployment.associate({ Category, DeploymentCategory });
  Category.associate({ Deployment, DeploymentCategory });
}
