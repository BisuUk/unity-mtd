﻿using System;
using System.Collections.Generic;
using System.Text;

namespace LibNoise.Modifiers
{
    public class Power
        : IModule
    {
        public IModule BaseModule { get; set; }
        public IModule PowerModule { get; set; }

        public Power(IModule baseModule, IModule powerModule)
        {
            if (baseModule == null || powerModule == null)
                throw new ArgumentNullException("Base and power modules must be provided.");

            BaseModule = baseModule;
            PowerModule = powerModule;
        }

        public double GetValue(double x, double y, double z)
        {
            if (BaseModule == null || PowerModule == null)
                throw new NullReferenceException("Base and power modules must be provided.");
            return System.Math.Pow(BaseModule.GetValue(x, y, z), PowerModule.GetValue(x, y, z));
        }
    }
}
