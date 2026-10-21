import unittest,tempfile,pathlib,json,unittest.mock as mock
import study_service as s,local_app,learning_service
class StudyTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();root=pathlib.Path(self.temp.name)
  self.patches=[mock.patch.object(s,'DB',root/'study.sqlite'),mock.patch.object(local_app,'DATA',root),mock.patch.object(learning_service,'DB',root/'learning.sqlite')]
  for p in self.patches:p.start()
  self.p1=s.save_paper(dict(title='Baseline paper',authors='A',source='https://example.org/a',summary='Initial abstract'))
  self.p2=s.save_paper(dict(title='New solution',authors='B'))
 def tearDown(self):
  for p in reversed(self.patches):p.stop()
  __import__("gc").collect();self.temp.cleanup()
 def course(self,name='Test course'):return s.save_record('course',dict(name=name,goal='Explain methods'))
 def test_courses_resources_duplicate_and_shared(self):
  a=self.course();b=self.course('Other');data=dict(courseId=a['id'],unit='论文阅读',resourceKind='paper',resourceId=self.p1['id'])
  first=s.add_link(data);again=s.add_link(data);self.assertEqual(first['id'],again['id']);self.assertTrue(again['alreadyExists'])
  s.add_link(dict(data,courseId=b['id']));self.assertEqual(len(s.state()['links']),2)
  with self.assertRaises(ValueError):s.save_record('course',dict(a,units=['基础知识']))
 def test_archive_restore_and_revision(self):
  a=self.course();s.archive(dict(kind='course',id=a['id']));self.assertFalse(s.state()['courses']);self.assertEqual(len(s.state()['archivedCourses']),1)
  with self.assertRaises(ValueError):s.add_link(dict(courseId=a['id'],unit='论文阅读',resourceKind='paper',resourceId=self.p1['id']))
  s.archive(dict(kind='course',id=a['id'],restore=True));s.save_record('course',dict(a,goal='Updated'))
  with self.assertRaises(ValueError):s.save_record('course',a)
 def test_comparison_distinct_and_notes(self):
  with self.assertRaises(ValueError):s.save_record('comparison',dict(name='Bad',paperIds=[self.p1['id']]*2))
  c=s.save_record('comparison',dict(name='Two methods',paperIds=[self.p1['id'],self.p2['id']],rows={self.p1['id']:{'method':'Baseline'}}))
  self.assertEqual(c['rows'][self.p1['id']]['method'],'Baseline');s.archive(dict(kind='comparison',id=c['id']));self.assertEqual(len(s.state()['archivedComparisons']),1)
 def test_manual_queue_date_dedup_remove_restore(self):
  data=dict(date='2026-10-21',paperId=self.p1['id'],reason='Chosen intentionally');s.add_queue(data);s.add_queue(data);self.assertEqual(len(s.state(data['date'])['queue']),1);self.assertFalse(s.state('2026-10-22')['queue'])
  s.remove_queue(data);self.assertFalse(s.state(data['date'])['queue']);s.remove_queue(dict(data,restore=True));self.assertEqual(s.state(data['date'])['queue'][0]['reason'],data['reason'])
  p=s.save_paper(dict(self.p1,summary='Updated abstract'));self.assertEqual(s.resolve('paper',p['id'])['summary'],'Updated abstract')
  with self.assertRaises(ValueError):s.save_paper(dict(title='Unsafe',pdf='javascript:alert(1)'))
 def test_tasks_and_module_link(self):
  definitions=json.loads((s.ROOT/'web'/'paper-task-definitions.json').read_text(encoding='utf-8'));self.assertEqual(len(definitions),19)
  task=s.task_detail(self.p1['id'],'minimal-run');self.assertIn('日志',task['detail']);self.assertNotIn('paper',task)
  a=self.course();m=learning_service.list_modules()[0];link=s.add_link(dict(courseId=a['id'],unit='基础知识',resourceKind='module',resourceId=m['id']));self.assertEqual(link['resourceKind'],'module')
  with self.assertRaises(ValueError):s.task_detail(self.p1['id'],'missing')
if __name__=='__main__':unittest.main()

