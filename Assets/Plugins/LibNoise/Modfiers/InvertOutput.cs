using System;
using System.Collections.Generic;
using System.Text;

namespace LibNoise.Modifiers
{
    public class InvertOutput
        : IModule
    {
        public IModule SourceModule { get; set; }

        public InvertOutput(IModule sourceModule)
        {
            if (sourceModule == null)
                throw new ArgumentNullException("A source module must be provided.");

            SourceModule = sourceModule;
        }

        public double GetValue(double x, double y, double z)
        {
            if (SourceModule == null)
                throw new NullReferenceException("A source module must be provided.");

            return -SourceModule.GetValue(x, y, z);
        }
    }
}
