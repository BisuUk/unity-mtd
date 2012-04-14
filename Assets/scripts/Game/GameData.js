#pragma strict


static var player : PlayerData;
static var map : MapData;

static var hostType : int;

var roundTime : float = 10*60;
private var roundStartTime : float ;
var netView : NetworkView;

function Awake()
{
   if (player == null)
      player = GetComponent(PlayerData);
   if (map == null)
      map = GetComponent(MapData);
}

function Start ()
{
   roundStartTime = Time.time;
}

function Update ()
{
   if (Time.time >= roundStartTime+roundTime)
   {
      // Round over!
   }

}