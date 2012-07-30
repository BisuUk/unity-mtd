#pragma strict

var sources : AudioSource[];

function PlaySource(sourceNum : int)
{
   if (sourceNum < sources.Length)
      sources[sourceNum].Play();
}

