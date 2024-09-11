import Category from './category';
import Deployment from './deployment';
import DeploymentCategory from './deployment-category';

const models = {
  Deployment,
  Category,
  DeploymentCategory,
};

export function initializeModels() {
  Object.values(models).forEach((model: any) => {
    if (model.associate) {
      model.associate(models);
    }
  });
}
