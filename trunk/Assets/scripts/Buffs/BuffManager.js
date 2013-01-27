#pragma strict

class Buff
{
   var type : int;
   var startTime : float;
   var lastTickTime : float;
   var interval : float;
   var duration : float;
   var t : Transform;

   function OnStart() {}
   function OnTick() {}
   function OnRemove() {}
   function OnExpire() {}
}


var buffs : List.<Buff>;

function Awake()
{
   buffs = new List.<Buff>();
}

function Tick()
{
   // NOTE: Iterates backwards so a remove can safely occur
   for (var i : int = buffs.Count-1; i >= 0; --i)
   {
      var b : Buff = buffs[i];
      if (Time.time >= b.startTime + b.duration)
      {
         b.OnExpire();
         buffs.RemoveAt(i);
      }
      else if (Time.time >= b.lastTickTime + b.interval)
      {
         b.OnTick();
         b.lastTickTime = Time.time;
      }
   }
}

function AddBuff(buff : Buff)
{
   buff.t = transform;
   buff.startTime = Time.time;
   buff.OnStart();
   buffs.Add(buff);
}


function RemoveBuff(type : int)
{
   for (var i : int = buffs.Count-1; i >= 0; --i)
   {
      var b : Buff = buffs[i];
      if (b.type == type)
      {
         buffs.RemoveAt(i);
         break;
      }
   }
}

