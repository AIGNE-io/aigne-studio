import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Op, Sequelize } from 'sequelize';

import nextId from '../../libs/next-id';
import { sequelize } from '../sequelize';

export default class History extends Model<InferAttributes<History>, InferCreationAttributes<History>> {
  declare id: CreationOptional<string>;

  declare userId?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare projectId: string;

  declare projectRef?: string;

  declare agentId: string;

  declare sessionId: string;

  declare blockletDid?: string;

  declare inputs?: { [key: string]: any } | null;

  declare outputs?: {
    content?: string;
    objects?: any[];
  } | null;

  declare steps?: {
    id: string;
    agentId: string;
    startTime: string;
    endTime: string;
    objects?: any[];
  }[];

  declare error?: { message: string } | null;

  declare status?: 'generating' | 'done';

  declare usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  // 请求类型, 目前仅支持 `free` 和 `paid` 两种类型, 前者表示未登录用户的调用, 空值与 `paid` 含义相同
  declare requestType?: 'free' | 'paid';

  declare projectOwnerId?: string;

  // 统计指定用户的有偿调用次数 (主动调用次数)
  static async countPaidRuns(userId: string) {
    return this.count({
      where: { error: null, requestType: { [Op.ne]: 'free' }, userId },
    });
  }

  // 统计指定用户的无偿调用次数, 即包括未登录用户在内的任何人对该用户所创建的任何项目发起的免费调用次数的总和 (被动调用次数)
  static async countFreeRuns(userId: string) {
    return this.count({
      where: { error: null, requestType: 'free', projectOwnerId: userId },
    });
  }

  // 统计指定用户所有的调用次数, 包括匿名调用和实名调用 2 部分
  static async countRunsByUser(userId: string) {
    const [freeRuns, paidRuns] = await Promise.all([this.countFreeRuns(userId), this.countPaidRuns(userId)]);
    return freeRuns + paidRuns;
  }

  static async countRunsPerProject(projectIds: string[]) {
    if (!projectIds?.length) return {};
    // Find all records that match the given project IDs and count the number of runs for each project.
    const counts = await this.findAll({
      where: { projectId: projectIds },
      attributes: ['projectId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['projectId'],
    });

    return Object.fromEntries(counts.map((i) => [i.projectId, (i.get('count') ?? 0) as number]));
  }
}

History.init(
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
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectRef: {
      type: DataTypes.STRING,
    },
    agentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    blockletDid: {
      type: DataTypes.STRING,
    },
    inputs: {
      type: DataTypes.JSON,
    },
    outputs: {
      type: DataTypes.JSON,
    },
    steps: {
      type: DataTypes.JSON,
    },
    error: {
      type: DataTypes.JSON,
    },
    status: {
      type: DataTypes.STRING,
    },
    usage: {
      type: DataTypes.JSON,
    },
    requestType: {
      type: DataTypes.STRING,
    },
    projectOwnerId: {
      type: DataTypes.STRING,
    },
  },
  { sequelize }
);
