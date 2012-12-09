using System;
using System.Collections.Generic;
using System.Text;

namespace LibNoise
{
    public class ValueNoiseBasis        
    {
        private const int XNoiseGen = 1619;
        private const int YNoiseGen = 31337;
        private const int ZNoiseGen = 6971;
        private const int SeedNoiseGen = 1013;
        private const int ShiftNoiseGen = 8;

        public int IntValueNoise(int x, int y, int z, int seed)
        {
            // All constants are primes and must remain prime in order for this noise
            // function to work correctly.
            int n = (
                XNoiseGen * x
              + YNoiseGen * y
              + ZNoiseGen * z
              + SeedNoiseGen * seed)
              & 0x7fffffff;
            n = (n >> 13) ^ n;
            return (n * (n * n * 60493 + 19990303) + 1376312589) & 0x7fffffff;
        }

        public double ValueNoise(int x, int y, int z)
        {
            return ValueNoise(x, y, z, 0);
        }

        public double ValueNoise(int x, int y, int z, int seed)
        {
            return 1.0 - ((double)IntValueNoise(x, y, z, seed) / 1073741824.0);
        }     
    }
}
