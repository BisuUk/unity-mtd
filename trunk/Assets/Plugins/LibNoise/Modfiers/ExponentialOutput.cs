using System;
using System.Collections.Generic;
using System.Text;

namespace LibNoise.Modfiers
{
    public class ExponentialOutput
        : IModule
    {
        public IModule SourceModule { get; set; }

        public double Exponent { get; set; }

        public ExponentialOutput(IModule sourceModule, double exponent)
        {
            if (sourceModule == null)
                throw new ArgumentNullException("A source module must be provided.");

            SourceModule = sourceModule;
            Exponent = exponent;
        }

        public double GetValue(double x, double y, double z)
        {
            if (SourceModule == null)
                throw new NullReferenceException("A source module must be provided.");

            return (System.Math.Pow(System.Math.Abs((SourceModule.GetValue(x, y, z) + 1.0) / 2.0), Exponent) * 2.0 - 1.0);
        }
    }
}
