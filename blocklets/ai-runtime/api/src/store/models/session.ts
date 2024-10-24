import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

import nextId from '../../libs/next-id';
import { sequelize } from '../sequelize';

export default class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
  declare id: CreationOptional<string>;

  declare userId?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare name?: string;

  declare projectId: string;

  declare agentId: string;

  static getUserSessions({ userId, projectId, agentId }: { userId: string; projectId: string; agentId: string }) {
    return this.findAll({
      where: { userId, projectId, agentId },
      order: [['id', 'desc']],
    });
  }

  static async countUniqueUsersPerProject(projectIds: string[]) {
    const counts = await this.findAll({
      where: { projectId: projectIds },
      attributes: ['projectId', [Sequelize.fn('COUNT', Sequelize.col('userId')), 'count']],
      group: ['projectId'],
    });
    return counts.reduce(
      (acc, cur) => {
        acc[cur.projectId] = (cur.get('count') ?? 0) as number;
        return acc;
      },
      {} as Record<string, number>
    );
  }
}

Session.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    userId: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    agentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { sequelize }
);
