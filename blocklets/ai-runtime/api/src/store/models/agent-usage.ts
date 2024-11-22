import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Op } from 'sequelize';

import nextId from '../../libs/next-id';
import { sequelize } from '../sequelize';

export default class AgentUsage extends Model<InferAttributes<AgentUsage>, InferCreationAttributes<AgentUsage>> {
  declare id: CreationOptional<string>;

  declare userId?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare projectId: string;

  declare projectRef?: string;

  declare agentId: string;

  declare sessionId: string;

  declare blockletDid?: string;

  // 请求类型, 目前仅支持 `free` 和 `paid` 两种类型, 前者表示无偿调用, 费用由 project owner 承担,
  // 若 agent 开启了匿名调用, 则所有调用记录的 requestType 都会标记为 'free'
  // (空值与 `paid` 含义相同)
  declare requestType: 'free' | 'paid';

  declare projectOwnerId?: string;

  // 统计指定用户的有偿调用次数 (主动调用次数)
  static async countPaidRuns(userId: string) {
    return this.count({
      where: { requestType: { [Op.ne]: 'free' }, userId },
    });
  }

  // 统计指定用户的无偿调用次数, 即包括未登录用户在内的任何人对该用户所创建的任何项目发起的免费调用次数的总和 (被动调用次数)
  static async countFreeRuns(userId: string) {
    return this.count({
      where: { requestType: 'free', projectOwnerId: userId },
    });
  }

  // 统计指定用户所有的调用次数, 包括匿名调用和实名调用 2 部分
  static async countRunsByUser(userId: string) {
    const [freeRuns, paidRuns] = await Promise.all([this.countFreeRuns(userId), this.countPaidRuns(userId)]);
    return freeRuns + paidRuns;
  }
}

AgentUsage.init(
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
    requestType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectOwnerId: {
      type: DataTypes.STRING,
    },
  },
  { sequelize }
);
